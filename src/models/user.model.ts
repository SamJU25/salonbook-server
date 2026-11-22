import mongoose, { Schema, type Document, type Model } from "mongoose";
import { USER_ROLES, type UserRole } from "../constants/salon.js";

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  role: UserRole;
  isBlocked: boolean;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Typed Mongoose wrapper over the Better Auth `users` collection.
 * Better Auth owns authentication credentials in `account`/`session`;
 * Express uses this model for role/block checks, admin user management,
 * and permitted profile updates.
 */
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: null,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "customer",
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      maxlength: 30,
    },
  },
  {
    collection: "users",
    timestamps: true,
  }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);
