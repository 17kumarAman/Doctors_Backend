import { Router } from "express";
import {
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getAllDoctors,
  getDoctor,
  loginDoctor,

  } from "../controllers/doctor.js";


const router = Router();

router.post("/createDoctor", createDoctor);
router.put("/updateDoctor/:id", updateDoctor);
router.delete("/deleteDoctor/:id", deleteDoctor);
router.get("/allDoctors", getAllDoctors);
router.get("/doctor/:id", getDoctor);
router.post("/loginDoctor", loginDoctor);


// Working




export default router;
