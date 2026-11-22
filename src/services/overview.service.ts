import mongoose from "mongoose";
import { Appointment } from "../models/appointment.model.js";
import { Service } from "../models/service.model.js";
import { Transaction } from "../models/transaction.model.js";
import { User } from "../models/user.model.js";
import { assertValidObjectId } from "../utils/objectId.js";

export async function getCustomerOverview(customerId: string) {
  assertValidObjectId(customerId, "Customer");

  const rows = await Appointment.aggregate<{ _id: string; count: number }>([
    { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  let totalAppointments = 0;
  let pendingAppointments = 0;
  let confirmedAppointments = 0;
  let cancelledAppointments = 0;

  for (const row of rows) {
    totalAppointments += row.count;
    if (row._id === "pending") pendingAppointments = row.count;
    if (row._id === "confirmed") confirmedAppointments = row.count;
    if (row._id === "cancelled") cancelledAppointments = row.count;
  }

  return {
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    cancelledAppointments,
  };
}

export async function getAdminOverview() {
  const [
    totalCustomers,
    totalActiveServices,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    totalSuccessfulPayments,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    Service.countDocuments({ status: "active" }),
    Appointment.countDocuments({}),
    Appointment.countDocuments({ status: "pending" }),
    Appointment.countDocuments({ status: "confirmed" }),
    Transaction.countDocuments({ status: "paid" }),
  ]);

  return {
    totalCustomers,
    totalActiveServices,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    totalSuccessfulPayments,
  };
}
