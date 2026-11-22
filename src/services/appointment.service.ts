import mongoose from "mongoose";
import type { AppointmentStatus, PaymentStatus, UserRole } from "../constants/salon.js";
import { Appointment, type IAppointment } from "../models/appointment.model.js";
import { Service } from "../models/service.model.js";
import { ApiError } from "../utils/apiError.js";
import { assertValidObjectId } from "../utils/objectId.js";
import type { CreateAppointmentInput } from "../validators/appointment.validator.js";

/**
 * Validates allowed Admin status transitions on an appointment.
 */
export function assertAdminAppointmentTransition(
  currentStatus: AppointmentStatus,
  paymentStatus: PaymentStatus,
  nextStatus: "confirmed" | "cancelled"
): void {
  if (nextStatus === "confirmed") {
    if (currentStatus !== "pending") {
      throw new ApiError(
        400,
        "Only pending appointments can be confirmed",
        "INVALID_STATUS_TRANSITION"
      );
    }
    return;
  }

  if (currentStatus === "cancelled") {
    throw new ApiError(
      400,
      "This appointment is already cancelled",
      "INVALID_STATUS_TRANSITION"
    );
  }

  if (paymentStatus === "paid") {
    throw new ApiError(
      400,
      "Paid appointments cannot be cancelled",
      "CANNOT_CANCEL_PAID"
    );
  }
}

/**
 * Checks whether an appointment date string (YYYY-MM-DD) is not in the past.
 * Uses a 12-hour buffer to accommodate client timezones ahead/behind UTC.
 */
export function assertNotPastDate(appointmentDate: string): void {
  const earliestAllowed = new Date(Date.now() - 12 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (appointmentDate < earliestAllowed) {
    throw new ApiError(
      400,
      "Appointment date cannot be in the past",
      "INVALID_DATE"
    );
  }
}

export async function createCustomerAppointment(
  customerId: string,
  input: CreateAppointmentInput
): Promise<IAppointment> {
  assertValidObjectId(customerId, "Customer");
  assertNotPastDate(input.appointmentDate);

  const service = await Service.findById(input.serviceId).lean();
  if (!service) {
    throw new ApiError(404, "Salon service not found", "SERVICE_NOT_FOUND");
  }
  if (service.status !== "active") {
    throw new ApiError(
      400,
      "Inactive services cannot be booked",
      "SERVICE_INACTIVE"
    );
  }

  const existingConflict = await Appointment.findOne({
    serviceId: service._id,
    appointmentDate: input.appointmentDate,
    timeSlot: input.timeSlot,
    status: { $in: ["pending", "confirmed"] },
  })
    .select("_id")
    .lean();

  if (existingConflict) {
    throw new ApiError(
      409,
      "This time slot is already booked for the selected date. Please choose another slot.",
      "SLOT_CONFLICT"
    );
  }

  try {
    const created = await Appointment.create({
      serviceId: service._id,
      customerId: new mongoose.Types.ObjectId(customerId),
      appointmentDate: input.appointmentDate,
      timeSlot: input.timeSlot,
      message: input.message || "",
      servicePrice: service.price,
      paymentStatus: "unpaid",
      status: "pending",
    });

    return created.toObject() as IAppointment;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      throw new ApiError(
        409,
        "This time slot is already booked for the selected date. Please choose another slot.",
        "SLOT_CONFLICT"
      );
    }
    throw err;
  }
}

export async function listCustomerAppointments(customerId: string) {
  assertValidObjectId(customerId, "Customer");

  return Appointment.find({
    customerId: new mongoose.Types.ObjectId(customerId),
  })
    .populate("serviceId", "serviceName category image duration price status")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getAppointmentDetails(
  appointmentId: string,
  requesterId: string,
  requesterRole: UserRole
) {
  assertValidObjectId(appointmentId, "Appointment");

  const appointment = await Appointment.findById(appointmentId)
    .populate("serviceId", "serviceName category image duration price status")
    .populate("customerId", "name email image phone")
    .lean();

  if (!appointment) {
    throw new ApiError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
  }

  const ownerId =
    typeof appointment.customerId === "object" &&
    appointment.customerId !== null &&
    "_id" in appointment.customerId
      ? String((appointment.customerId as { _id: unknown })._id)
      : String(appointment.customerId);

  if (requesterRole !== "admin" && ownerId !== requesterId) {
    throw new ApiError(
      403,
      "You can only view your own appointments",
      "FORBIDDEN"
    );
  }

  return appointment;
}

export async function cancelCustomerAppointment(
  appointmentId: string,
  customerId: string
): Promise<IAppointment> {
  assertValidObjectId(appointmentId, "Appointment");

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
  }

  if (String(appointment.customerId) !== customerId) {
    throw new ApiError(
      403,
      "You can only cancel your own appointments",
      "FORBIDDEN"
    );
  }

  if (appointment.status !== "pending") {
    throw new ApiError(
      400,
      "Only pending appointment requests can be cancelled",
      "INVALID_STATUS_TRANSITION"
    );
  }

  appointment.status = "cancelled";
  await appointment.save();
  return appointment.toObject() as IAppointment;
}

export async function listAllAppointmentsAdmin() {
  return Appointment.find({})
    .populate("serviceId", "serviceName category image duration price status")
    .populate("customerId", "name email image phone isBlocked")
    .sort({ createdAt: -1 })
    .lean();
}

export async function updateAppointmentStatusAdmin(
  appointmentId: string,
  nextStatus: "confirmed" | "cancelled"
): Promise<IAppointment> {
  assertValidObjectId(appointmentId, "Appointment");

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
  }

  assertAdminAppointmentTransition(
    appointment.status,
    appointment.paymentStatus,
    nextStatus
  );

  appointment.status = nextStatus;
  await appointment.save();
  return appointment.toObject() as IAppointment;
}
