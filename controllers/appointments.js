import db from "../config/db.js";
import {removeUndefined} from "../utils/utils.js";
// import { db } from '../config/db.js';

// ---------------------------  Doctor Appointment Booking ---------------------------------

export const bookAppointment = async (req, res) => {
  try {
    const data = req.body;

    // Required fields validation
    const requiredFields = [
      "patient_name",
      "doctor_id",
      "appointment_date",
      "appointment_time",
    ];
    for (const field of requiredFields) {
      if (!(field in data)) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Check doctor exists and active
    const [doctorRows] = await db.execute(
      'SELECT id FROM doctors WHERE id = ? AND status = "Active"',
      [data.doctor_id]
    );
    if (doctorRows.length === 0) {
      return res.status(404).json({ error: "Doctor not found or inactive" });
    }

    // Check if doctor has availability on the requested appointment date
    const [scheduleRows] = await db.execute(
      `SELECT * FROM doctor_schedule
       WHERE doctor_id = ? AND available_date = ?`,
      [data.doctor_id, data.appointment_date]
    );

    if (scheduleRows.length === 0) {
      return res
        .status(400)
        .json({ error: "Doctor not available on this date" });
    }

    const schedule = scheduleRows[0];
    const apptTime = data.appointment_time;

    // Check if appointment time is within available hours and outside the break time
    if (
      apptTime < schedule.start_time ||
      apptTime > schedule.end_time ||
      (schedule.break_start &&
        schedule.break_end &&
        apptTime >= schedule.break_start &&
        apptTime < schedule.break_end) // <= ko < kiya
    ) {
      return res
        .status(400)
        .json({ error: "Appointment time outside doctor availability hours" });
    }

    // NEW: Check hourly appointment limit (4 appointments per hour)
    const appointmentHour = new Date(`1970-01-01T${apptTime}`).getHours();
    const hourStart = `${appointmentHour.toString().padStart(2, "0")}:00:00`;
    const hourEnd = `${appointmentHour.toString().padStart(2, "0")}:59:59`;

    const [hourlyCount] = await db.execute(
      `SELECT COUNT(*) as count FROM appointments
             WHERE doctor_id = ? AND appointment_date = ? 
               AND appointment_time >= ? AND appointment_time <= ?
               AND status IN ('Pending', 'Accepted', 'Confirmed')`,
      [data.doctor_id, data.appointment_date, hourStart, hourEnd]
    );

    if (hourlyCount[0].count >= 4) {
      return res.status(400).json({
        error:
          "Maximum 4 appointments per hour limit reached for this time slot",
      });
    }

    // Check if the exact appointment slot is already booked
    const [existingAppts] = await db.execute(
      `SELECT * FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? 
         AND status IN ('Pending', 'Accepted', 'Confirmed')`,
      [data.doctor_id, data.appointment_date, data.appointment_time]
    );

    if (existingAppts.length > 0) {
      return res.status(400).json({ error: "Appointment slot already booked" });
    }

    // Optional fields and defaults
    if (!("status" in data)) data.status = "Pending";

    // Allowed fields to insert
    const allowedFields = [
      "patient_name",
      "patient_email",
      "patient_phone",
      "doctor_id",
      "appointment_date",
      "appointment_time",
      "patient_age",
      "status",
      "reason",
    ];

    // Filter incoming data to allowed fields
    const filteredData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) filteredData[key] = data[key];
    }

    // Dynamic insert query construction
    const fields = Object.keys(filteredData);
    const placeholders = fields.map(() => "?").join(", ");
    const values = fields.map((key) => filteredData[key]);

    const query = `INSERT INTO appointments (${fields.join(
      ", "
    )}) VALUES (${placeholders})`;

    const [result] = await db.execute(query, values);

    res.status(201).json({
      id: result.insertId,
      ...filteredData,
      message: "Appointment booked successfully",
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ error: "Could not book appointment" });
  }
};

// NEW: Get available time slots for a doctor on a specific date
export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    // Check if doctor has schedule for this date
    const [scheduleRows] = await db.execute(
      `SELECT * FROM doctor_schedule WHERE doctor_id = ? AND available_date = ?`,
      [doctorId, date]
    );

    if (scheduleRows.length === 0) {
      return res
        .status(404)
        .json({ error: "Doctor not available on this date" });
    }

    const schedule = scheduleRows[0];

    // Get all existing appointments for this doctor on this date
    const [appointments] = await db.execute(
      `SELECT appointment_time FROM appointments
             WHERE doctor_id = ? AND appointment_date = ? 
               AND status IN ('Pending', 'Accepted', 'Confirmed')`,
      [doctorId, date]
    );

    // Create set of booked times for quick lookup
    const bookedTimes = new Set(
      appointments.map((apt) => apt.appointment_time)
    );

    // Parse schedule times
    const startTime = new Date(`1970-01-01T${schedule.start_time}`);
    const endTime = new Date(`1970-01-01T${schedule.end_time}`);
    const breakStart = schedule.break_start
      ? new Date(`1970-01-01T${schedule.break_start}`)
      : null;
    const breakEnd = schedule.break_end
      ? new Date(`1970-01-01T${schedule.break_end}`)
      : null;

    const availableSlots = [];
    const currentTime = new Date(startTime);

    // Generate 15-minute slots
    while (currentTime < endTime) {
      const timeString = currentTime.toTimeString().substring(0, 8); // HH:MM:SS format
      const displayTime = currentTime.toTimeString().substring(0, 5); // HH:MM format

      // Check if slot is during break time
      const isBreakTime =
        breakStart &&
        breakEnd &&
        currentTime >= breakStart &&
        currentTime < breakEnd;

      // Check if slot is booked
      const isBooked = bookedTimes.has(timeString);

      // Check hourly limit (max 4 appointments per hour)
      const currentHour = currentTime.getHours();
      const hourStart = `${currentHour.toString().padStart(2, "0")}:00:00`;
      const hourEnd = `${currentHour.toString().padStart(2, "0")}:59:59`;

      const [hourlyCount] = await db.execute(
        `SELECT COUNT(*) as count FROM appointments
                 WHERE doctor_id = ? AND appointment_date = ? 
                   AND appointment_time >= ? AND appointment_time <= ?
                   AND status IN ('Pending', 'Accepted', 'Confirmed')`,
        [doctorId, date, hourStart, hourEnd]
      );

      const hourlyBookedCount = hourlyCount[0].count;
      const isHourlyLimitReached = hourlyBookedCount >= 4;

      // Determine slot status
      let status,
        reason = null;

      if (isBreakTime) {
        status = "break";
        reason = "Break time";
      } else if (isBooked) {
        status = "booked";
        reason = "Already booked";
      } else if (isHourlyLimitReached) {
        status = "unavailable";
        reason = "Hour limit reached (4 max)";
      } else {
        status = "available";
      }

      availableSlots.push({
        time: displayTime,
        fullTime: timeString,
        status: status,
        reason: reason,
      });

      // Move to next 15-minute slot
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }

    // Group slots by hour for better organization
    const slotsByHour = {};
    availableSlots.forEach((slot) => {
      const hour = slot.time.substring(0, 2);
      if (!slotsByHour[hour]) {
        slotsByHour[hour] = [];
      }
      slotsByHour[hour].push(slot);
    });

    // Calculate summary
    const totalSlots = availableSlots.length;
    const availableCount = availableSlots.filter(
      (slot) => slot.status === "available"
    ).length;
    const bookedCount = availableSlots.filter(
      (slot) => slot.status === "booked"
    ).length;
    const breakCount = availableSlots.filter(
      (slot) => slot.status === "break"
    ).length;
    const unavailableCount = availableSlots.filter(
      (slot) => slot.status === "unavailable"
    ).length;

    res.json({
      date,
      doctorId,
      schedule: {
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        break_start: schedule.break_start,
        break_end: schedule.break_end,
      },
      summary: {
        totalSlots,
        availableCount,
        bookedCount,
        breakCount,
        unavailableCount,
      },
      slotsByHour,
      allSlots: availableSlots,
    });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Could not fetch available slots" });
  }
};

// GET /api/appointments/doctor/:doctorId
export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, status } = req.query; // Optional query filters

    let query = "SELECT * FROM appointments WHERE doctor_id = ?";
    const queryParams = [doctorId];

    if (date) {
      query += " AND appointment_date = ?";
      queryParams.push(date);
    }

    if (status) {
      query += " AND status = ?";
      queryParams.push(status);
    }

    query += " ORDER BY appointment_date DESC, appointment_time DESC";

    const [rows] = await db.execute(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch doctor appointments" });
  }
};

// PATCH /api/appointments/:id/status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatus = [
      "Pending",
      "Accepted",
      "Rejected",
      "Confirmed",
      "Cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [result] = await db.execute(
      "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json({ message: "Appointment status updated", status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update appointment status" });
  }
};

// DELETE /api/appointments/:id
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute("DELETE FROM appointments WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json({ message: "Appointment deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete appointment" });
  }
};

// GET /api/admin/appointments
export const getAllAppointmentsWithDoctor = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT 
            a.*, 
            d.full_name AS doctor_name, 
            d.email AS doctor_email, 
            d.specialization, 
            d.phone AS doctor_phone
          FROM appointments a
          JOIN doctors d ON a.doctor_id = d.id`;

    const queryParams = [];
    const conditions = [];

    if (status) {
      conditions.push("a.status = ?");
      queryParams.push(status);
    }

    if (date) {
      conditions.push("a.appointment_date = ?");
      queryParams.push(date);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC";
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.execute(query, queryParams);

    // Get total count for pagination
    let countQuery =
      "SELECT COUNT(*) as total FROM appointments a JOIN doctors d ON a.doctor_id = d.id";
    const countParams = [];

    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
      countParams.push(...queryParams.slice(0, -2)); // Remove limit and offset
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      appointments: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch all appointments" });
  }
};

// Doctor Files imported Functions

export const getAllAppointments = async (req, res) => {
  try {
    const [appointments] = await db.execute(
      "SELECT * FROM appointments ORDER BY appointment_date DESC"
    );

    return res.status(200).json({
      status: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Fetch appointments error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

export const getAppointmentsByDoctorId = async (req, res) => {
  try {
    const { doctor_id } = req.params;

    if (!doctor_id) {
      return res
        .status(400)
        .json({ message: "doctor_id is required", status: false });
    }

    const [appointments] = await db.query(
      "SELECT * FROM appointments WHERE doctor_id = ? ORDER BY appointment_date DESC, appointment_time DESC",
      [doctor_id]
    );

    // if (appointments.length === 0) {
    //   return res
    //     .status(404)
    //     .json({ message: "No appointments found", status: false });
    // }

    return res.status(200).json({
      message: "Appointments fetched successfully",
      status: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments by doctor_id:", error);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      error: error.message,
    });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_name,
      patient_email,
      patient_phone,
      appointment_date,
      appointment_time,
      status,
      reason,
    } = req.body;

    // Optional fields check
    const data = removeUndefined({
      patient_name,
      patient_email,
      patient_phone,
      appointment_date,
      appointment_time,
      status,
      reason,
    });

    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No data provided for update" });
    }

    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(data);

    const query = `UPDATE appointments SET ${fields} WHERE id = ?`;
    await db.execute(query, [...values, id]);

    return res.status(200).json({
      status: true,
      message: "Appointment updated successfully",
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};




export const getAvailabilityByDoctorId = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const [rows] = await db.execute(
      "SELECT * FROM doctor_schedule WHERE doctor_id = ?",
      [doctor_id]
    );
    res.json({ status: true, data: rows });
  } catch (error) {
    console.error("Fetch doctor availability error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};
