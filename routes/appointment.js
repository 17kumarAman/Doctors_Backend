// appointments.js routes
import express from "express";
import {
  bookAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getAllAppointmentsWithDoctor,
  deleteAppointment,
  getAvailableTimeSlots, // NEW: Added this import



  getAllAppointments,
  updateAppointment,
  getAvailabilityByDoctorId,
  getAppointmentsByDoctorId,
} from "../controllers/appointments.js";

const router = express.Router();

// Route to book appointment
router.post("/book", bookAppointment); //ok                        // koi bhi book kare

// NEW: Get available time slots for a doctor on specific date
router.get("/available-slots/:doctorId/:date", getAvailableTimeSlots); //ok

router.get("/doctor/:doctorId", getDoctorAppointments); // doctor apni dekh sakta (with optional query filters)
router.put("/book/:id/status", updateAppointmentStatus); // doctor status update kare
router.get("/admin/all", getAllAppointmentsWithDoctor); // admin all with doctor data (with pagination)
router.delete("/book/:id", deleteAppointment);

router.get("/appointments", getAllAppointments);
router.get("/appointments/doctor/:doctor_id", getAppointmentsByDoctorId);
router.put("/appointments/:id", updateAppointment);
router.delete("/appointments/:id", deleteAppointment); // delete appointment
router.get("/getDoctorAvailability/:doctor_id", getAvailabilityByDoctorId);

export default router;