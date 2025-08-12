// Test script for the improved appointment booking system
// This script demonstrates the new features:
// 1. 15-minute appointment slots
// 2. Maximum 4 appointments per hour
// 3. Doctor availability validation
// 4. Slot availability checking

const testAppointmentSystem = async () => {
  console.log("=== Testing Improved Appointment Booking System ===\n");

  // Test data
  const baseURL = "http://localhost:3000/api/doctors";
  const testDoctor = {
    full_name: "Dr. John Smith",
    email: "john.smith@test.com",
    password: "password123",
    phone: "1234567890",
    specialization: "Cardiology",
    consultation_fee: 100.00
  };

  const testSchedule = {
    doctor_id: 1, // Assuming doctor ID 1 exists
    day_of_week: "Monday",
    start_time: "09:00",
    end_time: "17:00",
    break_start: "12:00",
    break_end: "13:00"
  };

  const testAppointments = [
    {
      patient_name: "Alice Johnson",
      patient_email: "alice@test.com",
      patient_phone: "1111111111",
      doctor_id: 1,
      appointment_date: "2024-01-15", // Next Monday
      appointment_time: "09:00",
      reason: "Regular checkup"
    },
    {
      patient_name: "Bob Wilson",
      patient_email: "bob@test.com",
      patient_phone: "2222222222",
      doctor_id: 1,
      appointment_date: "2024-01-15",
      appointment_time: "09:15",
      reason: "Follow-up"
    },
    {
      patient_name: "Carol Davis",
      patient_email: "carol@test.com",
      patient_phone: "3333333333",
      doctor_id: 1,
      appointment_date: "2024-01-15",
      appointment_time: "09:30",
      reason: "Consultation"
    },
    {
      patient_name: "David Brown",
      patient_email: "david@test.com",
      patient_phone: "4444444444",
      doctor_id: 1,
      appointment_date: "2024-01-15",
      appointment_time: "09:45",
      reason: "Initial visit"
    },
    {
      patient_name: "Eve Miller",
      patient_email: "eve@test.com",
      patient_phone: "5555555555",
      doctor_id: 1,
      appointment_date: "2024-01-15",
      appointment_time: "10:00",
      reason: "Emergency"
    }
  ];

  console.log("Test Scenarios:");
  console.log("1. Create doctor availability schedule");
  console.log("2. Get available slots for a specific date");
  console.log("3. Book appointments (should allow 4 per hour)");
  console.log("4. Try to book 5th appointment in same hour (should fail)");
  console.log("5. Try to book invalid time slot (should fail)");
  console.log("6. Try to book during break time (should fail)");
  console.log("7. Try to book on non-working day (should fail)\n");

  // Helper function to make API calls
  const makeRequest = async (url, method = 'GET', data = null) => {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();
      
      return {
        status: response.status,
        data: result
      };
    } catch (error) {
      return {
        status: 500,
        data: { error: error.message }
      };
    }
  };

  // Test 1: Create doctor availability
  console.log("1. Creating doctor availability schedule...");
  const availabilityResult = await makeRequest(
    `${baseURL}/createDoctorAvailability`,
    'POST',
    testSchedule
  );
  console.log(`Status: ${availabilityResult.status}`);
  console.log(`Response:`, JSON.stringify(availabilityResult.data, null, 2));
  console.log("");

  // Test 2: Get available slots
  console.log("2. Getting available slots for 2024-01-15...");
  const slotsResult = await makeRequest(
    `${baseURL}/appointments/available-slots/1/2024-01-15`
  );
  console.log(`Status: ${slotsResult.status}`);
  console.log(`Available slots:`, slotsResult.data?.data?.available_slots?.length || 0);
  console.log("");

  // Test 3: Book first 4 appointments (should succeed)
  console.log("3. Booking first 4 appointments in the same hour...");
  for (let i = 0; i < 4; i++) {
    const appointment = testAppointments[i];
    console.log(`Booking appointment ${i + 1}: ${appointment.appointment_time}`);
    
    const bookingResult = await makeRequest(
      `${baseURL}/appointments`,
      'POST',
      appointment
    );
    
    console.log(`Status: ${bookingResult.status}`);
    console.log(`Message: ${bookingResult.data?.message}`);
    console.log("");
  }

  // Test 4: Try to book 5th appointment (should fail)
  console.log("4. Trying to book 5th appointment in the same hour...");
  const fifthAppointment = testAppointments[4];
  const fifthBookingResult = await makeRequest(
    `${baseURL}/appointments`,
    'POST',
    fifthAppointment
  );
  console.log(`Status: ${fifthBookingResult.status}`);
  console.log(`Message: ${fifthBookingResult.data?.message}`);
  console.log("");

  // Test 5: Try to book invalid time slot
  console.log("5. Trying to book invalid time slot (09:10)...");
  const invalidAppointment = {
    ...testAppointments[0],
    appointment_time: "09:10"
  };
  const invalidBookingResult = await makeRequest(
    `${baseURL}/appointments`,
    'POST',
    invalidAppointment
  );
  console.log(`Status: ${invalidBookingResult.status}`);
  console.log(`Message: ${invalidBookingResult.data?.message}`);
  console.log("");

  // Test 6: Try to book during break time
  console.log("6. Trying to book during break time (12:30)...");
  const breakTimeAppointment = {
    ...testAppointments[0],
    appointment_time: "12:30"
  };
  const breakTimeResult = await makeRequest(
    `${baseURL}/appointments`,
    'POST',
    breakTimeAppointment
  );
  console.log(`Status: ${breakTimeResult.status}`);
  console.log(`Message: ${breakTimeResult.data?.message}`);
  console.log("");

  // Test 7: Try to book on non-working day
  console.log("7. Trying to book on Sunday (non-working day)...");
  const sundayAppointment = {
    ...testAppointments[0],
    appointment_date: "2024-01-14" // Sunday
  };
  const sundayResult = await makeRequest(
    `${baseURL}/appointments`,
    'POST',
    sundayAppointment
  );
  console.log(`Status: ${sundayResult.status}`);
  console.log(`Message: ${sundayResult.data?.message}`);
  console.log("");

  console.log("=== Test Complete ===");
};

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testAppointmentSystem();
} else {
  // Browser environment
  window.testAppointmentSystem = testAppointmentSystem;
}

export default testAppointmentSystem; 