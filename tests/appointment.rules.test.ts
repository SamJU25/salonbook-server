import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAdminAppointmentTransition,
  assertNotPastDate,
  assertSlotNotPast,
} from "../src/services/appointment.service.js";
import { ApiError } from "../src/utils/apiError.js";
import { isValidCalendarDate } from "../src/utils/date.js";
import { createAppointmentSchema } from "../src/validators/appointment.validator.js";
import { updateProfileSchema } from "../src/validators/user.validator.js";

describe("appointment rules & profile whitelist", () => {
  it("enforces allowed admin appointment status transitions", () => {
    // Pending -> Confirmed & Pending -> Cancelled allowed
    assert.doesNotThrow(() =>
      assertAdminAppointmentTransition("pending", "unpaid", "confirmed")
    );
    assert.doesNotThrow(() =>
      assertAdminAppointmentTransition("pending", "unpaid", "cancelled")
    );
    // Confirmed (unpaid) -> Cancelled allowed
    assert.doesNotThrow(() =>
      assertAdminAppointmentTransition("confirmed", "unpaid", "cancelled")
    );

    // Cancelled -> Confirmed or Confirmed -> Confirmed disallowed
    assert.throws(
      () => assertAdminAppointmentTransition("cancelled", "unpaid", "confirmed"),
      (err: unknown) => err instanceof ApiError && err.statusCode === 400
    );
    assert.throws(
      () => assertAdminAppointmentTransition("confirmed", "unpaid", "confirmed"),
      (err: unknown) => err instanceof ApiError && err.statusCode === 400
    );

    // Confirmed (paid) -> Cancelled disallowed
    assert.throws(
      () => assertAdminAppointmentTransition("confirmed", "paid", "cancelled"),
      (err: unknown) => err instanceof ApiError && err.statusCode === 400
    );
  });

  it("rejects clearly past appointment dates, invalid calendar dates, past slots today, and invalid time slots", () => {
    assert.throws(
      () => assertNotPastDate("2020-01-01"),
      (err: unknown) => err instanceof ApiError && err.statusCode === 400
    );

    assert.equal(isValidCalendarDate("2026-02-30"), false);
    assert.equal(isValidCalendarDate("2028-02-29"), true);
    assert.equal(isValidCalendarDate("2026-02-29"), false);

    // 2026-05-10 04:00 UTC = 1:00 PM KST in Seoul (Asia/Seoul)
    const middaySeoul = new Date("2026-05-10T04:00:00Z");
    assert.throws(
      () => assertSlotNotPast("2026-05-10", "09:00 AM", middaySeoul),
      (err: unknown) => err instanceof ApiError && err.code === "SLOT_IN_PAST"
    );
    assert.doesNotThrow(() =>
      assertSlotNotPast("2026-05-10", "03:00 PM", middaySeoul)
    );

    const invalidDate = createAppointmentSchema.safeParse({
      serviceId: "507f1f77bcf86cd799439011",
      appointmentDate: "2026-02-30",
      timeSlot: "09:00 AM",
    });
    assert.equal(invalidDate.success, false);

    const invalidSlot = createAppointmentSchema.safeParse({
      serviceId: "507f1f77bcf86cd799439011",
      appointmentDate: "2030-05-10",
      timeSlot: "02:15 AM",
    });
    assert.equal(invalidSlot.success, false);
  });

  it("rejects role, isBlocked, or email tampering in profile updates", () => {
    const roleTamper = updateProfileSchema.safeParse({
      name: "Sam",
      role: "admin",
    });
    assert.equal(roleTamper.success, false);

    const blockTamper = updateProfileSchema.safeParse({
      isBlocked: false,
    });
    assert.equal(blockTamper.success, false);

    const emailTamper = updateProfileSchema.safeParse({
      email: "new@example.com",
    });
    assert.equal(emailTamper.success, false);

    const valid = updateProfileSchema.safeParse({
      name: "Sam Chakma",
      phone: "+8801700000000",
    });
    assert.equal(valid.success, true);
  });
});
