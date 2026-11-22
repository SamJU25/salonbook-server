import mongoose from "mongoose";
import type Stripe from "stripe";
import { getEnv } from "../config/env.js";
import { getStripe } from "../config/stripe.js";
import { Appointment } from "../models/appointment.model.js";
import { Transaction } from "../models/transaction.model.js";
import { ApiError } from "../utils/apiError.js";
import { assertValidObjectId, isValidObjectId } from "../utils/objectId.js";

interface PopulatedServiceSummary {
  _id: mongoose.Types.ObjectId;
  serviceName: string;
  category: string;
  image: string;
}

/**
 * Verifies a Stripe webhook signature against the raw request buffer.
 */
export function constructVerifiedStripeEvent(
  rawBody: Buffer,
  signature: string | undefined,
  webhookSecret: string = getEnv().STRIPE_WEBHOOK_SECRET,
  stripeClient: Stripe = getStripe()
): Stripe.Event {
  if (!signature) {
    throw new ApiError(400, "Missing Stripe signature header", "INVALID_WEBHOOK");
  }

  try {
    return stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new ApiError(400, "Invalid Stripe webhook signature", "INVALID_WEBHOOK");
  }
}

export async function createCheckoutSessionForAppointment(
  appointmentId: string,
  customerId: string,
  customerEmail: string
): Promise<{ url: string; sessionId: string }> {
  assertValidObjectId(appointmentId, "Appointment");

  const appointment = await Appointment.findById(appointmentId)
    .populate<{ serviceId: PopulatedServiceSummary | null }>(
      "serviceId",
      "serviceName category image"
    )
    .lean();

  if (!appointment) {
    throw new ApiError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
  }

  if (String(appointment.customerId) !== customerId) {
    throw new ApiError(
      403,
      "You can only pay for your own appointments",
      "FORBIDDEN"
    );
  }

  if (appointment.status !== "confirmed") {
    throw new ApiError(
      400,
      "Only confirmed appointments can be paid for",
      "APPOINTMENT_NOT_CONFIRMED"
    );
  }

  if (appointment.paymentStatus === "paid") {
    throw new ApiError(
      400,
      "This appointment has already been paid",
      "ALREADY_PAID"
    );
  }

  const serviceName = appointment.serviceId?.serviceName || "Salon Appointment";
  const serviceCategory = appointment.serviceId?.category || "Salon Service";

  const { CLIENT_URL } = getEnv();
  const baseClientUrl = CLIENT_URL.split(",")[0]!.trim().replace(/\/+$/, "");
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(appointment.servicePrice * 100),
          product_data: {
            name: serviceName,
            description: `${serviceCategory} — ${appointment.appointmentDate} at ${appointment.timeSlot}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      appointmentId: String(appointment._id),
      customerId,
    },
    success_url: `${baseClientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseClientUrl}/payment/cancel?appointmentId=${String(appointment._id)}`,
  });

  if (!session.url) {
    throw new ApiError(
      502,
      "Failed to generate Stripe Checkout session URL",
      "STRIPE_SESSION_ERROR"
    );
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Processes a cryptographically verified Stripe webhook event idempotently.
 * Appointment paymentStatus is ONLY marked "paid" here.
 */
export async function processVerifiedStripeEvent(
  event: Stripe.Event
): Promise<{ handled: boolean }> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return { handled: false };
    }

    const appointmentId = session.metadata?.appointmentId;
    const customerId = session.metadata?.customerId;
    if (
      !appointmentId ||
      !customerId ||
      !isValidObjectId(appointmentId) ||
      !isValidObjectId(customerId)
    ) {
      return { handled: false };
    }

    const existingPaid = await Transaction.findOne({
      stripeSessionId: session.id,
      status: "paid",
    })
      .select("_id")
      .lean();

    if (existingPaid) {
      return { handled: true };
    }

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        customerId: new mongoose.Types.ObjectId(customerId),
        status: "confirmed",
      },
      { $set: { paymentStatus: "paid" } },
      { new: true }
    );

    if (!appointment) {
      return { handled: false };
    }

    const amountPaid =
      typeof session.amount_total === "number"
        ? session.amount_total / 100
        : appointment.servicePrice;

    try {
      await Transaction.findOneAndUpdate(
        { stripeSessionId: session.id },
        {
          $set: {
            appointmentId: appointment._id,
            customerId: new mongoose.Types.ObjectId(customerId),
            amount: amountPaid,
            currency: (session.currency || "usd").toLowerCase(),
            status: "paid",
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      if (
        !(
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: number }).code === 11000
        )
      ) {
        throw err;
      }
    }

    return { handled: true };
  }

  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointmentId;
    const customerId = session.metadata?.customerId;

    if (
      !appointmentId ||
      !customerId ||
      !isValidObjectId(appointmentId) ||
      !isValidObjectId(customerId)
    ) {
      return { handled: false };
    }

    const existing = await Transaction.findOne({
      stripeSessionId: session.id,
    })
      .select("status")
      .lean();

    if (existing?.status === "paid") {
      return { handled: true };
    }

    const amountTotal =
      typeof session.amount_total === "number" ? session.amount_total / 100 : 0;

    await Transaction.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        $setOnInsert: {
          appointmentId: new mongoose.Types.ObjectId(appointmentId),
          customerId: new mongoose.Types.ObjectId(customerId),
          amount: amountTotal,
          currency: (session.currency || "usd").toLowerCase(),
          stripeSessionId: session.id,
          status: "failed",
        },
      },
      { upsert: true }
    );

    return { handled: true };
  }

  return { handled: false };
}

export async function getCustomerPaymentSessionStatus(
  sessionId: string,
  customerId: string
) {
  if (!sessionId.trim()) {
    throw new ApiError(400, "Stripe session ID is required", "INVALID_SESSION");
  }

  const transaction = await Transaction.findOne({
    stripeSessionId: sessionId.trim(),
    customerId: new mongoose.Types.ObjectId(customerId),
  })
    .populate({
      path: "appointmentId",
      select: "appointmentDate timeSlot status paymentStatus servicePrice serviceId",
      populate: {
        path: "serviceId",
        select: "serviceName category image duration",
      },
    })
    .lean();

  if (!transaction) {
    return {
      verified: false,
      status: "processing" as const,
      transaction: null,
    };
  }

  return {
    verified: transaction.status === "paid",
    status: transaction.status,
    transaction,
  };
}

export async function listAllTransactionsAdmin() {
  return Transaction.find({})
    .populate("customerId", "name email image phone")
    .populate({
      path: "appointmentId",
      select: "appointmentDate timeSlot status paymentStatus serviceId",
      populate: {
        path: "serviceId",
        select: "serviceName category price",
      },
    })
    .sort({ createdAt: -1 })
    .lean();
}
