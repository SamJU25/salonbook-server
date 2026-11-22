import type { Request, Response } from "express";
import * as appointmentService from "../services/appointment.service.js";
import type {
  AdminUpdateAppointmentStatusInput,
  CreateAppointmentInput,
} from "../validators/appointment.validator.js";

export async function postCreateAppointment(req: Request, res: Response): Promise<void> {
  const customerId = req.user!.id;
  const input = req.body as CreateAppointmentInput;
  const created = await appointmentService.createCustomerAppointment(customerId, input);
  res.status(201).json({
    success: true,
    message: "Appointment request submitted successfully",
    data: created,
  });
}

export async function getMyAppointments(req: Request, res: Response): Promise<void> {
  const customerId = req.user!.id;
  const appointments = await appointmentService.listCustomerAppointments(customerId);
  res.status(200).json({
    success: true,
    data: appointments,
  });
}

export async function getAppointmentById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const appointment = await appointmentService.getAppointmentDetails(
    id,
    req.user!.id,
    req.user!.role
  );
  res.status(200).json({
    success: true,
    data: appointment,
  });
}

export async function patchCancelMyAppointment(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const updated = await appointmentService.cancelCustomerAppointment(id, req.user!.id);
  res.status(200).json({
    success: true,
    message: "Appointment request cancelled",
    data: updated,
  });
}

export async function getAdminAppointments(_req: Request, res: Response): Promise<void> {
  const appointments = await appointmentService.listAllAppointmentsAdmin();
  res.status(200).json({
    success: true,
    data: appointments,
  });
}

export async function patchAdminAppointmentStatus(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const { status } = req.body as AdminUpdateAppointmentStatusInput;
  const updated = await appointmentService.updateAppointmentStatusAdmin(id, status);
  res.status(200).json({
    success: true,
    message: `Appointment ${status} successfully`,
    data: updated,
  });
}
