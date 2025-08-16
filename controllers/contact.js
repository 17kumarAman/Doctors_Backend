import db from "../config/db.js";
import { removeUndefined } from "../utils/utils.js";

export const createContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const data = removeUndefined({ name, email, phone, message });

    const fields = Object.keys(data);
    const placeholders = fields.map(() => "?").join(", ");
    const values = fields.map((key) => data[key]);

    const query = `INSERT INTO contact (${fields.join(
      ", "
    )}) VALUES (${placeholders})`;

    await db.execute(query, values);

    return res.status(201).json({
      success: true,
      message: "Successfully submitted contact",
      data,
    });
  } catch (error) {
    console.error("Error creating contact:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

export const getContacts = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM contact ORDER BY created_at DESC");
    return res.status(200).json({
      success: true,
      message: "Contacts fetched successfully",
      contacts: rows,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
