import type { Request, Response } from "express";
import * as serviceService from "../services/service.service.js";
import type {
  CreateServiceInput,
  ListServicesQuery,
  UpdateServiceInput,
} from "../validators/service.validator.js";

export async function getPublicServices(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListServicesQuery;
  const result = await serviceService.listPublicServices(query);
  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getServiceById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const role = req.user?.role ?? "customer";
  const service = await serviceService.getServiceDetails(id, role);
  res.status(200).json({
    success: true,
    data: service,
  });
}

export async function getServiceBookedSlots(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const date = String(req.query.date ?? "");
  const bookedSlots = await serviceService.getBookedSlotsForServiceDate(id, date);
  res.status(200).json({
    success: true,
    data: { bookedSlots },
  });
}

export async function getAdminServices(_req: Request, res: Response): Promise<void> {
  const services = await serviceService.listAllServicesAdmin();
  res.status(200).json({
    success: true,
    data: services,
  });
}

export async function postAdminService(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateServiceInput;
  const created = await serviceService.createService(input);
  res.status(201).json({
    success: true,
    message: "Service created successfully",
    data: created,
  });
}

export async function patchAdminService(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const input = req.body as UpdateServiceInput;
  const updated = await serviceService.updateService(id, input);
  res.status(200).json({
    success: true,
    message: "Service updated successfully",
    data: updated,
  });
}

export async function removeAdminService(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  await serviceService.deleteService(id);
  res.status(200).json({
    success: true,
    message: "Service deleted successfully",
  });
}
