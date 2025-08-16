import dotenv from "dotenv";
import mysql from "mysql2";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

const promisePool = pool.promise();

// Test connection
promisePool
  .query("SELECT 1")
  .then(() => {
    console.log("✅ MySQL Database connected successfully!");
  })
  .catch((err) => {
    console.error("❌ MySQL Database connection failed:", err.message);
  });

// properly export the pool for use elsewhere
// export default promisePool;

(async () => {
  try {
    await promisePool.query("SELECT 1");
    console.log("✅ MySQL Database connected successfully!");

    // ---- CREATE new tables ----
    const createAdminTable = `
  CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255) DEFAULT 'https://res.cloudinary.com/dknrega1a/image/upload/v1754938444/uploads/suk5ngbacvtpen8fynq4.jpg',
    role ENUM('super_admin', 'receptionist') DEFAULT 'receptionist',
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

    const createContactTable = `
      CREATE TABLE IF NOT EXISTS contact (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NULL
      )
    `;

    const createDoctorTable = `
      CREATE TABLE IF NOT EXISTS doctors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(15),
        gender ENUM('Male', 'Female', 'Other'),
        dob DATE,
        specialization VARCHAR(100),
        qualification VARCHAR(255),
        experience_years INT,
        bio TEXT,
        consultation_fee DECIMAL(10,2),
        available_days VARCHAR(50),
        available_time VARCHAR(50),
        profile_image VARCHAR(255) DEFAULT 'https://res.cloudinary.com/dknrega1a/image/upload/v1754935917/uploads/phczmx7xuhedc8zfkozb.jpg',
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    const createAppointmentTable = `
      CREATE TABLE IF NOT EXISTS appointments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        patient_name VARCHAR(100) NOT NULL,
        patient_age VARCHAR(10),
        patient_email VARCHAR(100),
        patient_phone VARCHAR(15),
        doctor_id INT NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status ENUM('Pending', 'Accepted', 'Rejected', 'Confirmed', 'Cancelled') DEFAULT 'Pending',
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `;

    const DoctorAvailabilityTable = `
      CREATE TABLE IF NOT EXISTS doctor_schedule (
        id INT PRIMARY KEY AUTO_INCREMENT,
        doctor_id INT NOT NULL,
        available_date DATE NOT NULL, 
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_start TIME,
        break_end TIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `;

    // Execute table creation in sequence
    await promisePool.query(createAdminTable);
    await promisePool.query(createContactTable);
    await promisePool.query(createDoctorTable);
    await promisePool.query(createAppointmentTable);
    await promisePool.query(DoctorAvailabilityTable);

    console.log("✅ All tables created successfully!");
  } catch (err) {
    console.error("❌ MySQL Database connection failed:", err.message);
  }
})();


export default promisePool;
