import type { Request, Response } from "express";
import * as paymentService from "../services/payment.service.js";
import type { CreateCheckoutSessionInput } from "../validators/payment.validator.js";

export async function postCreateCheckoutSession(
  req: Request,
  res: Response
): Promise<void> {
  const { appointmentId } = req.body as CreateCheckoutSessionInput;
  const result = await paymentService.createCheckoutSessionForAppointment(
    appointmentId,
    req.user!.id,
    req.user!.email
  );
  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getPaymentSessionStatus(
  req: Request,
  res: Response
): Promise<void> {
  const sessionId = String(req.params.sessionId ?? "");
  const result = await paymentService.getCustomerPaymentSessionStatus(
    sessionId,
    req.user!.id
  );
  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function postStripeWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const signature = req.headers["stripe-signature"];
  const sigHeader = Array.isArray(signature) ? signature[0] : signature;
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body || ""));

  const event = paymentService.constructVerifiedStripeEvent(rawBody, sigHeader);
  const result = await paymentService.processVerifiedStripeEvent(event);

  res.status(200).json({ received: true, handled: result.handled });
}

export async function getAdminTransactions(
  _req: Request,
  res: Response
): Promise<void> {
  const transactions = await paymentService.listAllTransactionsAdmin();
  res.status(200).json({
    success: true,
    data: transactions,
  });
}
