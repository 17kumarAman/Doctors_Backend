import db from '../config/db.js';


// ------------------------  Doctor Availability. -------------------------

// Create new schedule with dynamic insert

export const createNewSchedule = async (req, res) => {
  try {
    const data = req.body;

    // 1. Required fields validation
    const requiredFields = ['doctor_id', 'available_date', 'start_time', 'end_time'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // 2. Check doctor exists and is active
    const [doctorRows] = await db.execute(
      'SELECT id FROM doctors WHERE id = ? AND status = "Active"',
      [data.doctor_id]
    );
    if (doctorRows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found or inactive' });
    }

    // 3. Check existing schedule for doctor/date
    const [existingRows] = await db.execute(
      'SELECT id FROM doctor_schedule WHERE doctor_id = ? AND available_date = ?',
      [data.doctor_id, data.available_date]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ error: 'Schedule already exists for this doctor on this date' });
    }

    // Allowed fields - filter any unexpected input
    const allowedFields = [
      'doctor_id',
      'available_date',
      'start_time',
      'end_time',
      'break_start',
      'break_end',
    ];

    const filteredData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) filteredData[key] = data[key];
    }

    // Dynamic insert query construction
    const fields = Object.keys(filteredData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map((key) => filteredData[key]);

    const query = `INSERT INTO doctor_schedule (${fields.join(', ')}) VALUES (${placeholders})`;

    const [result] = await db.execute(query, values);

    res.status(201).json({ id: result.insertId, ...filteredData });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Could not create schedule' });
  }
};



// In Work
// Update existing schedule dynamically by id
export const updateSchedule = async (req, res) => {
    try {
        const data = req.body;
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Schedule id is required' });
        }

        // Allowed fields for update
        const allowedFields = [
            'doctor_id',
            'available_date',
            'start_time',
            'end_time',
            'break_start',
            'break_end',
        ];

        const filteredData = {};
        for (const key of allowedFields) {
            if (data[key] !== undefined) filteredData[key] = data[key];
        }

        if (Object.keys(filteredData).length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update' });
        }

        // Dynamic update query construction
        const fields = Object.keys(filteredData);
        const setString = fields.map((field) => `${field} = ?`).join(', ');
        const values = fields.map((key) => filteredData[key]);
        values.push(id);

        const query = `UPDATE doctor_schedule SET ${setString}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        const [result] = await db.execute(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({ message: 'Schedule updated successfully' });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ error: 'Could not update schedule' });
    }
};


// In Work
// Delete schedule by id
export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Schedule id is required' });
        }

        const [result] = await db.execute('DELETE FROM doctor_schedule WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Could not delete schedule' });
    }
};


// Not Work in
// Get schedules by doctor and date
export const getSchedulesByDoctorAndDate = async (req, res) => {
    try {
        const { doctorId, date } = req.params;

        if (!doctorId || !date) {
            return res.status(400).json({ error: 'doctorId and date are required' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM doctor_schedule WHERE doctor_id = ? AND available_date = ?',
            [doctorId, date]
        );

        res.json(rows);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Could not fetch schedules' });
    }
};
