import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { TRANSACTION_STATUSES, type TransactionStatus } from "../constants/salon.js";

export interface ITransaction extends Document {
  appointmentId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  currency: string;
  stripeSessionId: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: [true, "Appointment ID is required"],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: "usd",
    },
    stripeSessionId: {
      type: String,
      required: [true, "Stripe session ID is required"],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      required: true,
      index: true,
    },
  },
  {
    collection: "transactions",
    timestamps: true,
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index(
  { appointmentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "paid" },
    name: "unique_paid_appointment_transaction",
  }
);

export const Transaction: Model<ITransaction> =
  (mongoose.models.Transaction as Model<ITransaction>) ||
  mongoose.model<ITransaction>("Transaction", transactionSchema);
