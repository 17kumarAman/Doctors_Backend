# Doctor Appointment Booking System - Documentation

## Overview
The improved appointment booking system now includes proper slot management with 15-minute intervals and a maximum of 4 appointments per hour per doctor.

## Key Features

### 1. 15-Minute Appointment Slots
- Appointments can only be booked in 15-minute intervals
- Valid time formats: `09:00`, `09:15`, `09:30`, `09:45`, etc.
- Invalid time formats: `09:10`, `09:25`, `09:40`, etc.

### 2. Maximum 4 Appointments Per Hour
- Each hour can only have a maximum of 4 appointments
- System automatically checks availability before booking
- Returns error if hour is full

### 3. Doctor Availability Management
- Doctors can set their working hours for each day of the week
- Break times can be configured
- System validates appointments against doctor's schedule

### 4. Slot Availability Checking
- Real-time slot availability checking
- Prevents double booking
- Handles cancelled/rejected appointments properly

## API Endpoints

### 1. Create Doctor Availability
```
POST /api/doctors/createDoctorAvailability
```

**Request Body:**
```json
{
  "doctor_id": 1,
  "day_of_week": "Monday",
  "start_time": "09:00",
  "end_time": "17:00",
  "break_start": "12:00",
  "break_end": "13:00"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Doctor availability added successfully",
  "data": {
    "doctor_id": 1,
    "day_of_week": "Monday",
    "start_time": "09:00",
    "end_time": "17:00",
    "break_start": "12:00",
    "break_end": "13:00"
  }
}
```

### 2. Get Available Slots
```
GET /api/doctors/appointments/available-slots/:doctor_id/:date
```

**Example:**
```
GET /api/doctors/appointments/available-slots/1/2024-01-15
```

**Response:**
```json
{
  "status": true,
  "data": {
    "available_slots": [
      "09:00", "09:15", "09:30", "09:45",
      "10:00", "10:15", "10:30", "10:45",
      "11:00", "11:15", "11:30", "11:45",
      "13:00", "13:15", "13:30", "13:45",
      "14:00", "14:15", "14:30", "14:45",
      "15:00", "15:15", "15:30", "15:45",
      "16:00", "16:15", "16:30", "16:45"
    ],
    "doctor_schedule": {
      "id": 1,
      "doctor_id": 1,
      "day_of_week": "Monday",
      "start_time": "09:00",
      "end_time": "17:00",
      "break_start": "12:00",
      "break_end": "13:00"
    }
  }
}
```

### 3. Create Appointment
```
POST /api/doctors/appointments
```

**Request Body:**
```json
{
  "patient_name": "John Doe",
  "patient_email": "john@example.com",
  "patient_phone": "1234567890",
  "doctor_id": 1,
  "appointment_date": "2024-01-15",
  "appointment_time": "09:00",
  "reason": "Regular checkup"
}
```

**Success Response:**
```json
{
  "status": true,
  "message": "Appointment created successfully"
}
```

**Error Responses:**

**Invalid time format:**
```json
{
  "status": false,
  "message": "Appointment time must be in 15-minute intervals (e.g., 09:00, 09:15, 09:30, 09:45)"
}
```

**Slot not available:**
```json
{
  "status": false,
  "message": "Slot is not free. This time slot is already booked or the hour is full (maximum 4 appointments per hour)"
}
```

**Doctor not available:**
```json
{
  "status": false,
  "message": "Doctor is not available on this day"
}
```

**Break time conflict:**
```json
{
  "status": false,
  "message": "Appointment time conflicts with doctor's break time (12:00 - 13:00)"
}
```

## Validation Rules

### 1. Time Format Validation
- Must be in HH:MM format
- Minutes must be 00, 15, 30, or 45
- Examples: `09:00`, `09:15`, `09:30`, `09:45`

### 2. Date Validation
- Appointment date cannot be in the past
- Must be a valid date format (YYYY-MM-DD)

### 3. Doctor Availability Validation
- Doctor must be active
- Doctor must have a schedule for the requested day
- Appointment time must be within working hours
- Appointment time must not conflict with break time

### 4. Slot Availability Validation
- Maximum 4 appointments per hour per doctor
- No double booking of the same time slot
- Cancelled and rejected appointments don't count towards the limit

## Database Schema

### Appointments Table
```sql
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_name VARCHAR(100) NOT NULL,
  patient_email VARCHAR(100),
  patient_phone VARCHAR(15),
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('Pending', 'Accepted', 'Rejected', 'Confirmed', 'Cancelled') DEFAULT 'Pending',
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Doctor Schedule Table
```sql
CREATE TABLE doctor_schedule (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doctor_id INT NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Error Handling

The system provides specific error messages for different scenarios:

1. **400 Bad Request**: Invalid input data
2. **404 Not Found**: Doctor not found
3. **409 Conflict**: Slot already booked or hour full
4. **500 Internal Server Error**: Database or server errors

## Testing

Use the provided test script (`test_appointment_system.js`) to verify the system:

```bash
node test_appointment_system.js
```

The test script covers:
- Creating doctor availability
- Getting available slots
- Booking appointments (success cases)
- Testing slot limits (failure cases)
- Testing invalid time formats
- Testing break time conflicts
- Testing non-working days

## Frontend Integration

When integrating with the frontend, use the available slots endpoint to show users only the available time slots:

```javascript
// Get available slots for a specific date
const response = await fetch(`/api/doctors/appointments/available-slots/${doctorId}/${date}`);
const data = await response.json();

if (data.status) {
  // Display available slots to user
  const availableSlots = data.data.available_slots;
  // Update UI with available slots
}
```

## Best Practices

1. **Always check available slots** before showing booking options to users
2. **Validate time format** on both frontend and backend
3. **Handle errors gracefully** and show user-friendly messages
4. **Use proper date formatting** (YYYY-MM-DD) for dates
5. **Consider timezone differences** if applicable
6. **Implement proper logging** for debugging appointment issues 