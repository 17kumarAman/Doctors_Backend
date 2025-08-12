import express from 'express';
import { createNewSchedule, updateSchedule, deleteSchedule, getSchedulesByDoctorAndDate } from "../controllers/shedule.js"

const router = express.Router();

// Create new schedule
router.post('/createNewSchedule', createNewSchedule);

// Get schedules for a doctor on a specific date
router.get('/doctor/:doctorId/date/:date', getSchedulesByDoctorAndDate);

// In Work
// Update schedule by id
router.put('/updateSchedule/:id', updateSchedule);


// In Work
// Delete schedule by id
router.delete('/deleteSchedule/:id', deleteSchedule);

export default router;
