-- =====================================================================
-- Placement Drive and Candidate Approval Management System
-- Database: placement_management (MySQL 8.x / XAMPP phpMyAdmin)
-- Project Theme: Conflict Resource Allocation
-- =====================================================================

DROP DATABASE IF EXISTS placement_management;
CREATE DATABASE placement_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE placement_management;

-- ---------------------------------------------------------------------
-- 1. Users Table (Authentication & Master Roles)
-- ---------------------------------------------------------------------
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student', 'hr', 'interviewer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. Students Table
-- ---------------------------------------------------------------------
CREATE TABLE Students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    usn VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    cgpa DECIMAL(3, 2) NOT NULL,
    graduation_year INT NOT NULL,
    resume_url VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    is_eligible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT chk_student_cgpa CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    INDEX idx_student_dept (department),
    INDEX idx_student_cgpa (cgpa)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. Companies Table
-- ---------------------------------------------------------------------
CREATE TABLE Companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    company_name VARCHAR(150) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    website VARCHAR(255) NULL,
    contact_person VARCHAR(100) NOT NULL,
    contact_email VARCHAR(191) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_companies_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_company_name (company_name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. PlacementDrives Table
-- ---------------------------------------------------------------------
CREATE TABLE PlacementDrives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    job_role VARCHAR(100) NOT NULL,
    ctc_lpa DECIMAL(5, 2) NOT NULL,
    min_cgpa DECIMAL(3, 2) NOT NULL DEFAULT 6.00,
    eligible_branches VARCHAR(255) NOT NULL DEFAULT 'All',
    drive_date DATE NOT NULL,
    status ENUM('upcoming', 'active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drives_company FOREIGN KEY (company_id) REFERENCES Companies(id) ON DELETE CASCADE,
    CONSTRAINT chk_drive_cgpa CHECK (min_cgpa >= 0.00 AND min_cgpa <= 10.00),
    INDEX idx_drive_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. InterviewRounds Table
-- ---------------------------------------------------------------------
CREATE TABLE InterviewRounds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id INT NOT NULL,
    round_number INT NOT NULL,
    round_name VARCHAR(100) NOT NULL,
    round_type ENUM('online_test', 'gd', 'technical', 'hr') NOT NULL,
    pass_score DECIMAL(5, 2) NOT NULL DEFAULT 60.00,
    duration_minutes INT NOT NULL DEFAULT 45,
    CONSTRAINT fk_rounds_drive FOREIGN KEY (drive_id) REFERENCES PlacementDrives(id) ON DELETE CASCADE,
    CONSTRAINT uq_drive_round UNIQUE (drive_id, round_number)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. Applications Table
-- ---------------------------------------------------------------------
CREATE TABLE Applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id INT NOT NULL,
    student_id INT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('applied', 'shortlisted', 'in_progress', 'selected', 'rejected') DEFAULT 'applied',
    current_round_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_drive FOREIGN KEY (drive_id) REFERENCES PlacementDrives(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES Students(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_round FOREIGN KEY (current_round_id) REFERENCES InterviewRounds(id) ON DELETE SET NULL,
    CONSTRAINT uq_app_student_drive UNIQUE (drive_id, student_id),
    INDEX idx_app_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. Rooms Table (Conflict Resource 1)
-- ---------------------------------------------------------------------
CREATE TABLE Rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(30) NOT NULL UNIQUE,
    building VARCHAR(80) NOT NULL,
    floor INT NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    room_type ENUM('cabin', 'lab', 'hall', 'auditorium') NOT NULL DEFAULT 'cabin',
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_room_number (room_number)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. Interviewers Table (Conflict Resource 2)
-- ---------------------------------------------------------------------
CREATE TABLE Interviewers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(80) NOT NULL,
    designation VARCHAR(80) NOT NULL,
    specialization VARCHAR(150) NULL,
    CONSTRAINT fk_interviewers_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_interviewer_code (employee_code)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. InterviewSchedules Table (Core Conflict Allocation Entity)
-- ---------------------------------------------------------------------
CREATE TABLE InterviewSchedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    round_id INT NOT NULL,
    room_id INT NOT NULL,
    interviewer_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sched_application FOREIGN KEY (application_id) REFERENCES Applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_sched_round FOREIGN KEY (round_id) REFERENCES InterviewRounds(id) ON DELETE CASCADE,
    CONSTRAINT fk_sched_room FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sched_interviewer FOREIGN KEY (interviewer_id) REFERENCES Interviewers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_schedule_time CHECK (end_time > start_time),
    INDEX idx_sched_room_time (room_id, start_time, end_time),
    INDEX idx_sched_interviewer_time (interviewer_id, start_time, end_time)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. Results Table
-- ---------------------------------------------------------------------
CREATE TABLE Results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    schedule_id INT NULL,
    total_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    decision ENUM('selected', 'rejected', 'on_hold') NOT NULL,
    remarks TEXT NULL,
    declared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_results_application FOREIGN KEY (application_id) REFERENCES Applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_results_schedule FOREIGN KEY (schedule_id) REFERENCES InterviewSchedules(id) ON DELETE SET NULL,
    INDEX idx_result_decision (decision)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. Notifications Table
-- ---------------------------------------------------------------------
CREATE TABLE Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('unread', 'read') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notify_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_notify_user_status (user_id, status)
) ENGINE=InnoDB;
