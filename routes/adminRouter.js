import { Router } from "express";
import {
  getAdmin,
  loginAdmin,
  registerAdmin,
  updateAdmin,
  getAdminById,
} from "../controllers/admin.js";
const router = Router();

router.post("/admin/register", registerAdmin);
router.post("/admin/login", loginAdmin);
router.get("/admin/getAdmin", getAdmin);
router.put("/admin/updateAdmin/:id", updateAdmin);
router.get("/admin/getAdmin/:id", getAdminById);
export default router;
