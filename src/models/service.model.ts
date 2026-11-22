import mongoose, { Schema, type Document, type Model } from "mongoose";
import { SERVICE_STATUSES, type ServiceStatus } from "../constants/salon.js";

export interface IService extends Document {
  serviceName: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  image: string;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    serviceName: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      minlength: [2, "Service name must be at least 2 characters"],
      maxlength: [120, "Service name cannot exceed 120 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be a positive number"],
    },
    duration: {
      type: Number,
      required: [true, "Estimated duration is required"],
      min: [1, "Duration must be a positive number"],
      validate: {
        validator: Number.isInteger,
        message: "Duration must be a whole number of minutes",
      },
    },
    image: {
      type: String,
      required: [true, "Service image is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: SERVICE_STATUSES,
      default: "active",
      index: true,
    },
  },
  {
    collection: "services",
    timestamps: true,
  }
);

// Compound index for public listing (active services filtered by category and sorted by price)
serviceSchema.index({ status: 1, category: 1, price: 1 });
serviceSchema.index({ serviceName: "text" });

export const Service: Model<IService> =
  (mongoose.models.Service as Model<IService>) ||
  mongoose.model<IService>("Service", serviceSchema);
