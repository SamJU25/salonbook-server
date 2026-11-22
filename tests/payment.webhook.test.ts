import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Stripe from "stripe";
import { constructVerifiedStripeEvent } from "../src/services/payment.service.js";
import { ApiError } from "../src/utils/apiError.js";

describe("Stripe webhook signature verification", () => {
  const stripe = new Stripe("sk_test_dummy_key_for_signature_tests");
  const webhookSecret = "whsec_test_secret_1234567890";

  it("constructs an event when the Stripe signature is valid", () => {
    const payload = JSON.stringify({
      id: "evt_test_123",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_status: "paid",
        },
      },
    });

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    const event = constructVerifiedStripeEvent(
      Buffer.from(payload, "utf8"),
      header,
      webhookSecret,
      stripe
    );

    assert.equal(event.id, "evt_test_123");
    assert.equal(event.type, "checkout.session.completed");
  });

  it("rejects missing or tampered webhook signatures with 400", () => {
    const rawBody = Buffer.from(JSON.stringify({ id: "evt_fake" }), "utf8");

    assert.throws(
      () => constructVerifiedStripeEvent(rawBody, undefined, webhookSecret, stripe),
      (err: unknown) => err instanceof ApiError && err.statusCode === 400
    );

    assert.throws(
      () =>
        constructVerifiedStripeEvent(
          rawBody,
          "t=1700000000,v1=invalid_signature",
          webhookSecret,
          stripe
        ),
      (err: unknown) => err instanceof ApiError && err.statusCode === 400
    );
  });
});
