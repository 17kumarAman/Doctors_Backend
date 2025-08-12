// import express from 'express';
// import {
//     bookAppointment, getDoctorAppointments,
//     updateAppointmentStatus,
//     getAllAppointmentsWithDoctor,
//     deleteAppointment
// } from '../controllers/appointments.js';

// const router = express.Router();

// // Route to book appointment
// // router.post('/book', bookAppointment);
// router.post('/book', bookAppointment);                             // koi bhi book kare
// router.get('/doctor/:doctorId', getDoctorAppointments);           // doctor apni dekh sakta
// router.put('/book/:id/status', updateAppointmentStatus);             // doctor status update kare
// router.get('/admin/all', getAllAppointmentsWithDoctor);           // admin all with doctor data
// router.delete('/book/:id', deleteAppointment);                         // delete appointment

// export default router;




// appointments.js routes
import express from 'express';
import {
    bookAppointment, 
    getDoctorAppointments,
    updateAppointmentStatus,
    getAllAppointmentsWithDoctor,
    deleteAppointment,
    getAvailableTimeSlots  // NEW: Added this import
} from '../controllers/appointments.js';

const router = express.Router();

// Route to book appointment
router.post('/book', bookAppointment);                             // koi bhi book kare

// NEW: Get available time slots for a doctor on specific date
router.get('/available-slots/:doctorId/:date', getAvailableTimeSlots);

router.get('/doctor/:doctorId', getDoctorAppointments);           // doctor apni dekh sakta (with optional query filters)
router.put('/book/:id/status', updateAppointmentStatus);         // doctor status update kare
router.get('/admin/all', getAllAppointmentsWithDoctor);          // admin all with doctor data (with pagination)
router.delete('/book/:id', deleteAppointment);                   // delete appointment

export default router;