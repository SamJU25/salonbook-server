import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import {
  APPOINTMENT_STATUSES,
  PAYMENT_STATUSES,
  PREDEFINED_TIME_SLOTS,
  type AppointmentStatus,
  type PaymentStatus,
  type TimeSlot,
} from "../constants/salon.js";

export interface IAppointment extends Document {
  serviceId: Types.ObjectId;
  customerId: Types.ObjectId;
  appointmentDate: string;
  timeSlot: TimeSlot;
  message?: string;
  servicePrice: number;
  paymentStatus: PaymentStatus;
  status: AppointmentStatus;
  pendingStripeSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Service ID is required"],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
      index: true,
    },
    appointmentDate: {
      type: String,
      required: [true, "Appointment date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Appointment date must use YYYY-MM-DD format"],
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      enum: PREDEFINED_TIME_SLOTS,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
      default: "",
    },
    servicePrice: {
      type: Number,
      required: [true, "Service price snapshot is required"],
      min: [0.01, "Service price must be positive"],
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
      index: true,
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: "pending",
      index: true,
    },
    pendingStripeSessionId: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "appointments",
    timestamps: true,
  }
);

// Atomic guard preventing duplicate active (pending/confirmed) bookings for the same service, date, and slot.
// Cancelled appointments are excluded so freed slots can be re-booked.
appointmentSchema.index(
  { serviceId: 1, appointmentDate: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
    name: "unique_active_service_slot",
  }
);

appointmentSchema.index({ customerId: 1, createdAt: -1 });
appointmentSchema.index({ status: 1, createdAt: -1 });

export const Appointment: Model<IAppointment> =
  (mongoose.models.Appointment as Model<IAppointment>) ||
  mongoose.model<IAppointment>("Appointment", appointmentSchema);
