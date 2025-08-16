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

    res.json({
      success: true,
      message: "Doctor updated successfully",
      data: updateData,
    });
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
    const [rows] = await db.execute(`SELECT * FROM doctors WHERE id = ?`, [id]);
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



// Working
// Get appointments by doctor_id

