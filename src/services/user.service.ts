import mongoose from "mongoose";
import { Appointment } from "../models/appointment.model.js";
import { User, type IUser } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { assertValidObjectId } from "../utils/objectId.js";
import type { UpdateProfileInput } from "../validators/user.validator.js";

export async function getOwnProfile(userId: string) {
  assertValidObjectId(userId, "User");

  const user = await User.findById(userId)
    .select("name email image role isBlocked phone createdAt updatedAt")
    .lean();

  if (!user) {
    throw new ApiError(404, "User profile not found", "USER_NOT_FOUND");
  }

  return user;
}

export async function updateOwnProfile(
  userId: string,
  input: UpdateProfileInput
) {
  assertValidObjectId(userId, "User");

  const updates: Partial<Pick<IUser, "name" | "image" | "phone">> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.image !== undefined) updates.image = input.image;
  if (input.phone !== undefined) updates.phone = input.phone;

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .select("name email image role isBlocked phone createdAt updatedAt")
    .lean();

  if (!updated) {
    throw new ApiError(404, "User profile not found", "USER_NOT_FOUND");
  }

  return updated;
}

export async function listCustomersAdmin() {
  return User.find({ role: "customer" })
    .select("name email image role isBlocked phone createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getUserDetailsAdmin(userId: string) {
  assertValidObjectId(userId, "User");

  const [user, appointmentStats] = await Promise.all([
    User.findById(userId)
      .select("name email image role isBlocked phone createdAt updatedAt")
      .lean(),
    Appointment.aggregate<{ _id: string; count: number }>([
      { $match: { customerId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  const counts = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
  for (const row of appointmentStats) {
    counts.total += row.count;
    if (row._id === "pending") counts.pending = row.count;
    if (row._id === "confirmed") counts.confirmed = row.count;
    if (row._id === "cancelled") counts.cancelled = row.count;
  }

  return {
    ...user,
    appointmentStats: counts,
  };
}

export async function setUserBlockedAdmin(
  targetUserId: string,
  isBlocked: boolean,
  actingAdminId: string
) {
  assertValidObjectId(targetUserId, "User");

  if (targetUserId === actingAdminId) {
    throw new ApiError(
      400,
      "Administrators cannot block their own account",
      "SELF_BLOCK_FORBIDDEN"
    );
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  if (target.role === "admin") {
    throw new ApiError(
      403,
      "Administrator accounts cannot be blocked here",
      "ADMIN_BLOCK_FORBIDDEN"
    );
  }

  target.isBlocked = isBlocked;
  await target.save();

  return {
    _id: target._id,
    name: target.name,
    email: target.email,
    role: target.role,
    isBlocked: target.isBlocked,
    phone: target.phone ?? null,
    image: target.image ?? null,
  };
}
