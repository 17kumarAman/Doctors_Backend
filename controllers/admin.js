import bcrypt from "bcrypt";
import db from "../config/db.js";
import { removeUndefined } from "../utils/utils.js";

// Register Admin
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, phone, profile_image, password, role, status } =
      req.body;

    // Check if admin exists
    const [exists] = await db.query("SELECT id FROM admin WHERE email = ?", [
      email,
    ]);
    if (exists.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const data = removeUndefined({
      name,
      email,
      phone,
      profile_image,
      password: hashedPassword,
      role,
      status,
    });

    const fields = Object.keys(data);
    const placeholders = fields.map(() => "?").join(", ");
    const values = fields.map((key) => data[key]);

    await db.execute(
      `INSERT INTO admin (${fields.join(", ")}) VALUES (${placeholders})`,
      values
    );

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        name,
        email,
        phone,
        role: role || "admin",
        status: status || "active",
      },
    });
  } catch (err) {
    console.error("Register Admin Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
  }
};

// Login Admin
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM admin WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
        error: "Admin not found",
      });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        error: "Invalid credentials",
      });
    }

    // Remove password before sending response
    const { password: _, ...sanitizedAdmin } = admin;

    // Optionally generate JWT:
    // const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: sanitizedAdmin,
      // token // uncomment if using token
    });
  } catch (err) {
    console.error("Login Admin Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

// Get Admins
export const getAdmin = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM admin");

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No admin found",
        error: "No admin found",
      });
    }

    // Remove password field from each admin
    const sanitizedAdmins = rows.map(({ password, ...rest }) => rest);

    res.status(200).json({
      success: true,
      message: "Admin retrieved successfully",
      data: sanitizedAdmins,
    });
  } catch (err) {
    console.error("Get Admin Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, profile_image, password, role, status } =
      req.body;

    const data = removeUndefined({
      name,
      email,
      phone,
      profile_image,
      role,
      status,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
    });

    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = [...Object.values(data), id];

    const [result] = await db.execute(
      `UPDATE admin SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Admin updated successfully" });
  } catch (err) {
    console.error("Update Admin Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM admin WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("Get Admin Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
