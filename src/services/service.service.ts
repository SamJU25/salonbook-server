import type { SortOrder } from "mongoose";
import type { UserRole } from "../constants/salon.js";
import { Appointment } from "../models/appointment.model.js";
import { Service, type IService } from "../models/service.model.js";
import { ApiError } from "../utils/apiError.js";
import { assertValidObjectId } from "../utils/objectId.js";
import { escapeRegex } from "../utils/regex.js";
import type {
  CreateServiceInput,
  ListServicesQuery,
  UpdateServiceInput,
} from "../validators/service.validator.js";

function resolveServiceSort(sort: ListServicesQuery["sort"]): Record<string, SortOrder> {
  if (sort === "price_asc") return { price: 1, createdAt: -1 };
  if (sort === "price_desc") return { price: -1, createdAt: -1 };
  return { createdAt: -1 };
}

export async function listPublicServices(query: ListServicesQuery): Promise<{
  services: IService[];
  categories: string[];
}> {
  const filter: Record<string, unknown> = { status: "active" };

  if (query.search) {
    filter.serviceName = {
      $regex: escapeRegex(query.search),
      $options: "i",
    };
  }

  if (query.category && query.category.toLowerCase() !== "all") {
    filter.category = query.category;
  }

  const cursor = Service.find(filter).sort(resolveServiceSort(query.sort));
  if (query.limit) {
    cursor.limit(query.limit);
  }

  const [services, categories] = await Promise.all([
    cursor.lean<IService[]>(),
    Service.distinct("category", { status: "active" }),
  ]);

  return {
    services,
    categories: categories.sort(),
  };
}

export async function getServiceDetails(
  serviceId: string,
  requesterRole: UserRole
): Promise<IService> {
  assertValidObjectId(serviceId, "Service");

  const service = await Service.findById(serviceId).lean<IService | null>();
  if (!service) {
    throw new ApiError(404, "Salon service not found", "SERVICE_NOT_FOUND");
  }

  if (requesterRole !== "admin" && service.status !== "active") {
    throw new ApiError(
      404,
      "This salon service is currently unavailable",
      "SERVICE_UNAVAILABLE"
    );
  }

  return service;
}

export async function getBookedSlotsForServiceDate(
  serviceId: string,
  date: string
): Promise<string[]> {
  assertValidObjectId(serviceId, "Service");

  const service = await Service.findById(serviceId).select("status").lean();
  if (!service || service.status !== "active") {
    throw new ApiError(404, "Salon service is not available", "SERVICE_UNAVAILABLE");
  }

  const activeBookings = await Appointment.find({
    serviceId,
    appointmentDate: date,
    status: { $in: ["pending", "confirmed"] },
  })
    .select("timeSlot -_id")
    .lean();

  return activeBookings.map((b) => b.timeSlot);
}

export async function listAllServicesAdmin(): Promise<IService[]> {
  return Service.find({}).sort({ createdAt: -1 }).lean<IService[]>();
}

export async function createService(input: CreateServiceInput): Promise<IService> {
  const created = await Service.create(input);
  return created.toObject() as IService;
}

export async function updateService(
  serviceId: string,
  input: UpdateServiceInput
): Promise<IService> {
  assertValidObjectId(serviceId, "Service");

  const updated = await Service.findByIdAndUpdate(
    serviceId,
    { $set: input },
    { new: true, runValidators: true }
  ).lean<IService | null>();

  if (!updated) {
    throw new ApiError(404, "Salon service not found", "SERVICE_NOT_FOUND");
  }

  return updated;
}

export async function deleteService(serviceId: string): Promise<void> {
  assertValidObjectId(serviceId, "Service");

  const activeAppointmentsCount = await Appointment.countDocuments({
    serviceId,
    status: { $in: ["pending", "confirmed"] },
  });

  if (activeAppointmentsCount > 0) {
    throw new ApiError(
      409,
      "Cannot delete a service with active pending or confirmed appointments. Deactivate it instead.",
      "SERVICE_IN_USE"
    );
  }

  const deleted = await Service.findByIdAndDelete(serviceId);
  if (!deleted) {
    throw new ApiError(404, "Salon service not found", "SERVICE_NOT_FOUND");
  }
}
