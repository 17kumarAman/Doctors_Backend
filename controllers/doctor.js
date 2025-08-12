import db from "../config/db.js";
import { removeUndefined } from "../utils/utils.js";
import bcrypt from "bcrypt";

// Create a new doctor
export const createDoctor = async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      phone,
      gender,
      dob,
      specialization,
      qualification,
      experience_years,
      bio,
      consultation_fee,
      available_days,
      available_time,
      profile_image,
      status = "Active",
      created_by = null,
    } = req.body;

    // Required field check with specific message
    if (!full_name) {
      return res
        .status(400)
        .json({ message: "full_name is required", status: false });
    }
    if (!email) {
      return res
        .status(400)
        .json({ message: "email is required", status: false });
    }
    if (!password) {
      return res
        .status(400)
        .json({ message: "password is required", status: false });
    }

    // Check if doctor already exists
    const [existing] = await db.query(
      "SELECT id FROM doctors WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ message: "Doctor already exists", status: false });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = removeUndefined({
      full_name,
      email,
      password: hashedPassword,
      phone,
      gender,
      dob,
      specialization,
      qualification,
      experience_years,
      bio,
      consultation_fee,
      available_days,
      available_time,
      profile_image,
      status,
      created_by,
    });

    const fields = Object.keys(data);
    const placeholders = fields.map(() => "?").join(", ");
    const values = fields.map((key) => data[key]);

    const query = `INSERT INTO doctors (${fields.join(
      ", "
    )}) VALUES (${placeholders})`;
    await db.execute(query, values);

    return res.status(201).json({
      message: "Doctor created successfully",
      status: true,
      data: {
        full_name,
        email,
      },
    });
  } catch (error) {
    console.error("Error creating doctor:", error);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
      error: error.message,
    });
  }
};

// Update an existing doctor
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      password,
      phone,
      gender,
      dob,
      specialization,
      qualification,
      experience_years,
      bio,
      consultation_fee,
      available_days,
      available_time,
      profile_image,
      status,
    } = req.body;

    const updateData = removeUndefined({
      full_name,
      email,
      phone,
      gender,
      dob,
      specialization,
      qualification,
      experience_years,
      bio,
      consultation_fee,
      available_days,
      available_time,
      profile_image,
      status,
    });

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updateData.password = hashed;
    }

    const fields = Object.keys(updateData);
    const values = fields.map((key) => updateData[key]);
    const setClause = fields.map((key) => `${key} = ?`).join(", ");

    const query = `UPDATE doctors SET ${setClause} WHERE id = ?`;
    await db.execute(query, [...values, id]);

    res.json({ success: true, message: "Doctor updated successfully", data: updateData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a doctor
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(`DELETE FROM doctors WHERE id = ?`, [id]);
    res.json({ status: true, message: "Doctor deleted successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM doctors ORDER BY created_at DESC`
    );
    const filteredRows = rows.map(({ password, ...rest }) => rest);
    return res.json({ status: true, data: filteredRows });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};


// Get a doctor
export const getDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT * FROM doctors WHERE id = ?`, [
      id,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Doctor not found" });
    }
    return res.json({ status: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Login doctor
export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required",
      });
    }

    const [rows] = await db.execute(`SELECT * FROM doctors WHERE email = ?`, [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found",
      });
    }

    const doctor = rows[0];
    const isPasswordValid = await bcrypt.compare(password, doctor.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: false,
        message: "Invalid password",
      });
    }
    const { password: _, ...sanitizedDoctor } = doctor;

    return res.json({
      status: true,
      message: "Login successful",
      data: sanitizedDoctor,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Helper function to generate time slots for a given hour
const generateTimeSlots = (startTime, endTime) => {
  const slots = [];
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);

  while (start < end) {
    slots.push(start.toTimeString().slice(0, 5));
    start.setMinutes(start.getMinutes() + 15);
  }

  return slots;
};

// Helper function to check if a time slot is available
const isSlotAvailable = async (doctorId, appointmentDate, appointmentTime) => {
  try {
    // Check if there are already 4 appointments in the same hour
    const hourStart = appointmentTime.substring(0, 2) + ':00';
    const hourEnd = appointmentTime.substring(0, 2) + ':59';

    const [existingAppointments] = await db.execute(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? 
       AND appointment_time BETWEEN ? AND ? 
       AND status NOT IN ('Cancelled', 'Rejected')`,
      [doctorId, appointmentDate, hourStart, hourEnd]
    );

    if (existingAppointments[0].count >= 4) {
      return false;
    }

    // Check if the specific 15-minute slot is already booked
    const [specificSlot] = await db.execute(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? 
       AND appointment_time = ? 
       AND status NOT IN ('Cancelled', 'Rejected')`,
      [doctorId, appointmentDate, appointmentTime]
    );

    return specificSlot[0].count === 0;
  } catch (error) {
    console.error("Error checking slot availability:", error);
    return false;
  }
};

// Helper function to validate appointment time format (15-minute intervals)
const isValidAppointmentTime = (time) => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0|1|3][0|5]$/;
  return timeRegex.test(time);
};

// Helper function to get available slots for a doctor on a specific date
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, date } = req.params;

    if (!doctor_id || !date) {
      return res.status(400).json({
        status: false,
        message: "doctor_id and date are required"
      });
    }

    // Get doctor's schedule for the day of week
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

    const [schedule] = await db.execute(
      `SELECT * FROM doctor_schedule WHERE doctor_id = ? AND day_of_week = ?`,
      [doctor_id, dayOfWeek]
    );

    if (schedule.length === 0) {
      return res.status(200).json({
        status: true,
        message: "Doctor not available on this day",
        data: { available_slots: [] }
      });
    }

    const doctorSchedule = schedule[0];
    const allSlots = generateTimeSlots(doctorSchedule.start_time, doctorSchedule.end_time);

    // Filter out break time slots
    let availableSlots = allSlots;
    if (doctorSchedule.break_start && doctorSchedule.break_end) {
      availableSlots = allSlots.filter(slot => {
        const slotTime = new Date(`2000-01-01 ${slot}`);
        const breakStart = new Date(`2000-01-01 ${doctorSchedule.break_start}`);
        const breakEnd = new Date(`2000-01-01 ${doctorSchedule.break_end}`);
        return slotTime < breakStart || slotTime >= breakEnd;
      });
    }

    // Check which slots are already booked
    const [bookedSlots] = await db.execute(
      `SELECT appointment_time FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? 
       AND status NOT IN ('Cancelled', 'Rejected')`,
      [doctor_id, date]
    );

    const bookedTimes = bookedSlots.map(slot => slot.appointment_time);
    const finalAvailableSlots = availableSlots.filter(slot => !bookedTimes.includes(slot));

    return res.status(200).json({
      status: true,
      data: {
        available_slots: finalAvailableSlots,
        doctor_schedule: doctorSchedule
      }
    });
  } catch (error) {
    console.error("Error getting available slots:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const {
      patient_name,
      patient_email,
      patient_phone,
      doctor_id,
      appointment_date,
      appointment_time,
      reason,
    } = req.body;

    // Validation
    if (!patient_name || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        status: false,
        message:
          "Required fields: patient_name, doctor_id, appointment_date, appointment_time",
      });
    }

    // Validate appointment time format (15-minute intervals)
    if (!isValidAppointmentTime(appointment_time)) {
      return res.status(400).json({
        status: false,
        message: "Appointment time must be in 15-minute intervals (e.g., 09:00, 09:15, 09:30, 09:45)"
      });
    }

    // Check if doctor exists
    const [doctor] = await db.execute(
      "SELECT * FROM doctors WHERE id = ? AND status = 'Active'",
      [doctor_id]
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found or not active"
      });
    }

    // Check if the appointment date is in the future
    const appointmentDate = new Date(appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({
        status: false,
        message: "Appointment date cannot be in the past"
      });
    }

    // Check doctor availability for the specific day
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const [schedule] = await db.execute(
      `SELECT * FROM doctor_schedule WHERE doctor_id = ? AND day_of_week = ?`,
      [doctor_id, dayOfWeek]
    );

    if (schedule.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Doctor is not available on this day"
      });
    }

    const doctorSchedule = schedule[0];

    // Check if appointment time is within doctor's working hours
    const appointmentTime = new Date(`2000-01-01 ${appointment_time}`);
    const startTime = new Date(`2000-01-01 ${doctorSchedule.start_time}`);
    const endTime = new Date(`2000-01-01 ${doctorSchedule.end_time}`);

    if (appointmentTime < startTime || appointmentTime >= endTime) {
      return res.status(400).json({
        status: false,
        message: `Appointment time must be between ${doctorSchedule.start_time} and ${doctorSchedule.end_time}`
      });
    }

    // Check break time
    if (doctorSchedule.break_start && doctorSchedule.break_end) {
      const breakStart = new Date(`2000-01-01 ${doctorSchedule.break_start}`);
      const breakEnd = new Date(`2000-01-01 ${doctorSchedule.break_end}`);

      if (appointmentTime >= breakStart && appointmentTime < breakEnd) {
        return res.status(400).json({
          status: false,
          message: `Appointment time conflicts with doctor's break time (${doctorSchedule.break_start} - ${doctorSchedule.break_end})`
        });
      }
    }

    // Check slot availability
    const isAvailable = await isSlotAvailable(doctor_id, appointment_date, appointment_time);

    if (!isAvailable) {
      return res.status(409).json({
        status: false,
        message: "Slot is not free. This time slot is already booked or the hour is full (maximum 4 appointments per hour)"
      });
    }

    const query = `
      INSERT INTO appointments 
      (patient_name, patient_email, patient_phone, doctor_id, appointment_date, appointment_time, reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      patient_name,
      patient_email,
      patient_phone,
      doctor_id,
      appointment_date,
      appointment_time,
      reason,
    ];

    await db.execute(query, values);

    return res.status(201).json({
      status: true,
      message: "Appointment created successfully",
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

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

export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [appointment] = await db.execute(
      "SELECT * FROM appointments WHERE id = ?",
      [id]
    );

    if (appointment.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Appointment not found" });
    }

    return res.status(200).json({ status: true, data: appointment[0] });
  } catch (error) {
    console.error("Get appointment by ID error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
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

export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute("DELETE FROM appointments WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Appointment not found" });
    }

    return res
      .status(200)
      .json({ status: true, message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};


// Working
// Get appointments by doctor_id
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


export const createDoctorAvailability = async (req, res) => {
  try {
    const {
      doctor_id,
      day_of_week,
      start_time,
      end_time,
      break_start,
      break_end,
    } = req.body;

    // Validation
    if (!doctor_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({
        status: false,
        message: "doctor_id, day_of_week, start_time, and end_time are required"
      });
    }

    // Check if doctor exists
    const [doctor] = await db.execute(
      "SELECT id FROM doctors WHERE id = ? AND status = 'Active'",
      [doctor_id]
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Doctor not found or not active"
      });
    }

    // Validate day of week
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day_of_week)) {
      return res.status(400).json({
        status: false,
        message: "Invalid day_of_week. Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday"
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({
        status: false,
        message: "Invalid time format. Use HH:MM format (e.g., 09:00, 17:30)"
      });
    }

    // Validate that start_time is before end_time
    const startTime = new Date(`2000-01-01 ${start_time}`);
    const endTime = new Date(`2000-01-01 ${end_time}`);

    if (startTime >= endTime) {
      return res.status(400).json({
        status: false,
        message: "start_time must be before end_time"
      });
    }

    // Validate break time if provided
    if (break_start && break_end) {
      if (!timeRegex.test(break_start) || !timeRegex.test(break_end)) {
        return res.status(400).json({
          status: false,
          message: "Invalid break time format. Use HH:MM format"
        });
      }

      const breakStart = new Date(`2000-01-01 ${break_start}`);
      const breakEnd = new Date(`2000-01-01 ${break_end}`);

      if (breakStart >= breakEnd) {
        return res.status(400).json({
          status: false,
          message: "break_start must be before break_end"
        });
      }

      // Check if break time is within working hours
      if (breakStart < startTime || breakEnd > endTime) {
        return res.status(400).json({
          status: false,
          message: "Break time must be within working hours"
        });
      }
    }

    // Check if schedule already exists for this doctor and day
    const [existing] = await db.execute(
      "SELECT id FROM doctor_schedule WHERE doctor_id = ? AND day_of_week = ?",
      [doctor_id, day_of_week]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: false,
        message: "Schedule already exists for this doctor on this day. Use update instead."
      });
    }

    const query = `
      INSERT INTO doctor_schedule (doctor_id, day_of_week, start_time, end_time, break_start, break_end)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [doctor_id, day_of_week, start_time, end_time, break_start, break_end]);

    res.status(201).json({
      status: true,
      message: "Doctor availability added successfully",
      data: {
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        break_start,
        break_end
      }
    });
  } catch (error) {
    console.error("Create availability error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};


export const getAllDoctorAvailability = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM doctor_schedule ORDER BY doctor_id, day_of_week");
    res.json({ status: true, data: rows });
  } catch (error) {
    console.error("Fetch availability error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};


export const getAvailabilityByDoctorId = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const [rows] = await db.execute("SELECT * FROM doctor_schedule WHERE doctor_id = ?", [doctor_id]);
    res.json({ status: true, data: rows });
  } catch (error) {
    console.error("Fetch doctor availability error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};


export const updateDoctorAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      day_of_week,
      start_time,
      end_time,
      break_start,
      break_end
    } = req.body;

    const fields = [];
    const values = [];

    if (day_of_week) fields.push("day_of_week = ?"), values.push(day_of_week);
    if (start_time) fields.push("start_time = ?"), values.push(start_time);
    if (end_time) fields.push("end_time = ?"), values.push(end_time);
    if (break_start) fields.push("break_start = ?"), values.push(break_start);
    if (break_end) fields.push("break_end = ?"), values.push(break_end);

    if (!fields.length) {
      return res.status(400).json({ status: false, message: "No data to update" });
    }

    const query = `UPDATE doctor_schedule SET ${fields.join(", ")} WHERE id = ?`;
    await db.execute(query, [...values, id]);

    res.json({ status: true, message: "Availability updated" });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};



export const deleteDoctorAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute("DELETE FROM doctor_schedule WHERE id = ?", [id]);
    res.json({ status: true, message: "Availability deleted" });
  } catch (error) {
    console.error("Delete availability error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};
