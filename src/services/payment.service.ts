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

  const stripe = getStripe();

  // Reuse an already-open unpaid Checkout session to prevent duplicate charges across tabs.
  if (appointment.pendingStripeSessionId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(
        appointment.pendingStripeSessionId
      );
      if (
        existingSession.status === "open" &&
        existingSession.url &&
        existingSession.payment_status === "unpaid"
      ) {
        return {
          url: existingSession.url,
          sessionId: existingSession.id,
        };
      }
    } catch {
      // Fall through to create a fresh session if the previous one is invalid/expired.
    }
  }

  const serviceName = appointment.serviceId?.serviceName || "Salon Appointment";
  const serviceCategory = appointment.serviceId?.category || "Salon Service";

  const { CLIENT_URL } = getEnv();
  const baseClientUrl = CLIENT_URL.split(",")[0]!.trim().replace(/\/+$/, "");

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

  await Appointment.updateOne(
    { _id: appointment._id },
    { $set: { pendingStripeSessionId: session.id } }
  );

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Idempotently records a paid Stripe Checkout session onto an appointment & transaction.
 * Refunds if the appointment was cancelled in the meantime, and prevents duplicate paid records.
 */
async function fulfillPaidCheckoutSession(
  session: Stripe.Checkout.Session,
  stripeClient: Stripe = getStripe()
): Promise<{ handled: boolean }> {
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
    $or: [
      { stripeSessionId: session.id, status: "paid" },
      { appointmentId: new mongoose.Types.ObjectId(appointmentId), status: "paid" },
    ],
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
      paymentStatus: "unpaid",
    },
    {
      $set: { paymentStatus: "paid" },
      $unset: { pendingStripeSessionId: 1 },
    },
    { new: true }
  );

  if (!appointment) {
    const existingAppt = await Appointment.findById(appointmentId).lean();
    if (existingAppt?.paymentStatus === "paid") {
      return { handled: true };
    }

    // If an unpaid confirmed appointment was cancelled while customer finished Stripe Checkout,
    // automatically trigger a refund and mark the transaction failed so no charge is orphaned.
    if (existingAppt?.status === "cancelled") {
      if (typeof session.payment_intent === "string") {
        try {
          await stripeClient.refunds.create({
            payment_intent: session.payment_intent,
          });
        } catch (refundErr) {
          console.error("Failed automatic refund for cancelled appointment:", refundErr);
        }
      }

      const amountTotal =
        typeof session.amount_total === "number" ? session.amount_total / 100 : 0;
      await Transaction.findOneAndUpdate(
        { stripeSessionId: session.id },
        {
          $setOnInsert: {
            appointmentId: existingAppt._id,
            customerId: new mongoose.Types.ObjectId(customerId),
            amount: amountTotal,
            currency: (session.currency || "usd").toLowerCase(),
            stripeSessionId: session.id,
            status: "failed",
          },
        },
        { upsert: true }
      ).catch(() => {});
    }

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

/**
 * Processes a cryptographically verified Stripe webhook event idempotently.
 * Appointment paymentStatus is ONLY marked "paid" via verified Stripe payment data.
 */
export async function processVerifiedStripeEvent(
  event: Stripe.Event
): Promise<{ handled: boolean }> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    return fulfillPaidCheckoutSession(session);
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
  const trimmedSessionId = sessionId.trim();
  if (!trimmedSessionId) {
    throw new ApiError(400, "Stripe session ID is required", "INVALID_SESSION");
  }

  const populateOptions = {
    path: "appointmentId",
    select: "appointmentDate timeSlot status paymentStatus servicePrice serviceId",
    populate: {
      path: "serviceId",
      select: "serviceName category image duration",
    },
  };

  let transaction = await Transaction.findOne({
    stripeSessionId: trimmedSessionId,
    customerId: new mongoose.Types.ObjectId(customerId),
  })
    .populate(populateOptions)
    .lean();

  // Fallback to Stripe API directly when customer reaches /payment/success before webhook delivery.
  if (!transaction) {
    try {
      const stripe = getStripe();
      const retrieved = await stripe.checkout.sessions.retrieve(trimmedSessionId);
      if (retrieved.metadata?.customerId === customerId) {
        if (retrieved.payment_status === "paid") {
          await fulfillPaidCheckoutSession(retrieved, stripe);
          transaction = await Transaction.findOne({
            stripeSessionId: trimmedSessionId,
            customerId: new mongoose.Types.ObjectId(customerId),
          })
            .populate(populateOptions)
            .lean();
        } else if (retrieved.status === "expired") {
          return {
            verified: false,
            status: "failed" as const,
            transaction: null,
          };
        }
      }
    } catch {
      // Ignore transient Stripe API lookup failure and keep polling as processing.
    }
  }

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
