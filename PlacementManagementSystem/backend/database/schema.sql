-- =====================================================================
-- Placement Drive and Candidate Approval Management System
-- Database Schema Definition (MySQL 8.x / XAMPP phpMyAdmin)
-- Project Theme: Conflict Resource Allocation
-- Academic Disciplines: DBMS (3NF/BCNF Normalization, ACID, Stored Procs, Triggers)
-- =====================================================================

DROP DATABASE IF EXISTS placement_management_system;
CREATE DATABASE placement_management_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE placement_management_system;

-- ---------------------------------------------------------------------
-- 1. Master Authentication & User Management Table
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student', 'hr', 'interviewer') NOT NULL,
    status ENUM('active', 'inactive', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role_status (role, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. Institutional Academic Departments
-- ---------------------------------------------------------------------
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. Student Profile & Academic Records (1:1 with users)
-- ---------------------------------------------------------------------
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    usn_roll VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dept_id INT NOT NULL,
    cgpa DECIMAL(3, 2) NOT NULL,
    graduation_year INT NOT NULL,
    resume_url VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    is_eligible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_students_dept FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE RESTRICT,
    CONSTRAINT chk_student_cgpa CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    INDEX idx_students_cgpa (cgpa),
    INDEX idx_students_dept (dept_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. Company Profiles & HR Registrations (1:1 with users)
-- ---------------------------------------------------------------------
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    company_name VARCHAR(120) NOT NULL,
    industry_sector VARCHAR(80) NOT NULL,
    website VARCHAR(255) NULL,
    contact_person VARCHAR(100) NOT NULL,
    contact_email VARCHAR(191) NOT NULL,
    contact_phone VARCHAR(20) NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_companies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_company_name (company_name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. Interviewers & Evaluation Panelists (1:1 with users)
-- ---------------------------------------------------------------------
CREATE TABLE interviewers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    designation VARCHAR(80) NOT NULL,
    department_id INT NOT NULL,
    specialization VARCHAR(150) NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interviewers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_interviewers_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    INDEX idx_interviewer_dept (department_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. Physical & Virtual Resource Catalog: Rooms & Labs
-- ---------------------------------------------------------------------
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(30) NOT NULL UNIQUE,
    building_name VARCHAR(80) NOT NULL,
    floor_number INT NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    room_type ENUM('interview_cabin', 'gd_hall', 'online_test_lab', 'auditorium') NOT NULL,
    has_network BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_room_capacity CHECK (capacity > 0),
    INDEX idx_room_type_active (room_type, is_active)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. Placement Drives
-- ---------------------------------------------------------------------
CREATE TABLE placement_drives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    job_role VARCHAR(100) NOT NULL,
    job_description TEXT NULL,
    ctc_lpa DECIMAL(5, 2) NOT NULL,
    min_cgpa DECIMAL(3, 2) NOT NULL DEFAULT 6.00,
    eligible_dept_ids JSON NULL COMMENT 'Array of eligible department IDs',
    drive_date DATE NOT NULL,
    registration_deadline DATETIME NOT NULL,
    status ENUM('draft', 'open', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drives_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT chk_drive_cgpa CHECK (min_cgpa >= 0.00 AND min_cgpa <= 10.00),
    INDEX idx_drive_status_date (status, drive_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. Drive Rounds (Hierarchical Interview Stages)
-- ---------------------------------------------------------------------
CREATE TABLE drive_rounds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id INT NOT NULL,
    round_number INT NOT NULL,
    round_name VARCHAR(100) NOT NULL,
    round_type ENUM('online_test', 'gd', 'technical_interview', 'hr_interview') NOT NULL,
    pass_criteria_score DECIMAL(5, 2) NOT NULL DEFAULT 60.00,
    duration_minutes INT NOT NULL DEFAULT 45,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rounds_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    CONSTRAINT uq_drive_round_number UNIQUE (drive_id, round_number)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. Student Applications & Approval Lifecycle
-- ---------------------------------------------------------------------
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id INT NOT NULL,
    student_id INT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('applied', 'shortlisted', 'in_progress', 'selected', 'rejected') DEFAULT 'applied',
    current_round_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_round FOREIGN KEY (current_round_id) REFERENCES drive_rounds(id) ON DELETE SET NULL,
    CONSTRAINT uq_drive_student_app UNIQUE (drive_id, student_id),
    INDEX idx_app_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. Conflict-Controlled Resource Allocation: Interview Schedules
-- ---------------------------------------------------------------------
CREATE TABLE interview_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    round_id INT NOT NULL,
    room_id INT NOT NULL,
    interviewer_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled') DEFAULT 'scheduled',
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sched_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_sched_round FOREIGN KEY (round_id) REFERENCES drive_rounds(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sched_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sched_interviewer FOREIGN KEY (interviewer_id) REFERENCES interviewers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_schedule_time_window CHECK (end_time > start_time),
    INDEX idx_sched_room_window (room_id, start_time, end_time),
    INDEX idx_sched_interviewer_window (interviewer_id, start_time, end_time),
    INDEX idx_sched_app (application_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. Interview Scoring & Candidate Evaluations
-- ---------------------------------------------------------------------
CREATE TABLE interview_evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL UNIQUE,
    interviewer_id INT NOT NULL,
    technical_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    communication_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    problem_solving_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    total_score DECIMAL(5, 2) GENERATED ALWAYS AS (technical_score + communication_score + problem_solving_score) STORED,
    decision ENUM('recommended', 'not_recommended', 'on_hold') NOT NULL,
    feedback_text TEXT NULL,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eval_schedule FOREIGN KEY (schedule_id) REFERENCES interview_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_eval_interviewer FOREIGN KEY (interviewer_id) REFERENCES interviewers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 12. OSPP Mutex & Concurrency Lock Table
-- ---------------------------------------------------------------------
CREATE TABLE resource_locks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_type ENUM('room', 'interviewer', 'student') NOT NULL,
    resource_id INT NOT NULL,
    locked_by_tx VARCHAR(64) NOT NULL,
    lock_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_resource_lock UNIQUE (resource_type, resource_id),
    INDEX idx_lock_expiry (expires_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 13. Producer-Consumer Notification Queue Table
-- ---------------------------------------------------------------------
CREATE TABLE notification_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL,
    CONSTRAINT fk_notify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_status (status, priority)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 14. Immutable System Audit Log
-- ---------------------------------------------------------------------
CREATE TABLE system_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- =====================================================================
-- DATABASE TRIGGERS
-- =====================================================================

DELIMITER $$

-- Trigger 1: Auto-notify student upon interview schedule creation
CREATE TRIGGER trg_enqueue_notification_on_schedule
AFTER INSERT ON interview_schedules
FOR EACH ROW
BEGIN
    DECLARE v_student_user_id INT;
    DECLARE v_drive_title VARCHAR(150);
    DECLARE v_round_name VARCHAR(100);
    DECLARE v_room_number VARCHAR(30);

    -- Retrieve student user id and metadata
    SELECT s.user_id, pd.title, dr.round_name, r.room_number
    INTO v_student_user_id, v_drive_title, v_round_name, v_room_number
    FROM applications a
    JOIN students s ON a.student_id = s.id
    JOIN placement_drives pd ON a.drive_id = pd.id
    JOIN drive_rounds dr ON NEW.round_id = dr.id
    JOIN rooms r ON NEW.room_id = r.id
    WHERE a.id = NEW.application_id;

    -- Push to Producer-Consumer notification queue
    INSERT INTO notification_queue (user_id, title, message, priority, status)
    VALUES (
        v_student_user_id,
        CONCAT('Interview Scheduled: ', v_drive_title),
        CONCAT('Your interview for ', v_round_name, ' has been scheduled in Room ', v_room_number, ' from ', NEW.start_time, ' to ', NEW.end_time),
        'high',
        'pending'
    );
END$$

-- Trigger 2: Auto-audit log when application status changes
CREATE TRIGGER trg_audit_application_status
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO system_audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (
            NULL,
            'APPLICATION_STATUS_CHANGE',
            'applications',
            NEW.id,
            JSON_OBJECT('old_status', OLD.status, 'new_status', NEW.status, 'drive_id', NEW.drive_id, 'student_id', NEW.student_id)
        );
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- STORED PROCEDURES
-- =====================================================================

DELIMITER $$

-- Stored Procedure: Atomic Conflict-Free Interview Scheduling with Row Locking
CREATE PROCEDURE sp_check_and_schedule_interview (
    IN p_application_id INT,
    IN p_round_id INT,
    IN p_room_id INT,
    IN p_interviewer_id INT,
    IN p_start_time DATETIME,
    IN p_end_time DATETIME,
    OUT p_schedule_id INT,
    OUT p_status_code VARCHAR(30),
    OUT p_message VARCHAR(255)
)
proc_block: BEGIN
    DECLARE v_conflict_count INT DEFAULT 0;
    DECLARE v_student_id INT;

    -- Default failure response
    SET p_schedule_id = NULL;
    SET p_status_code = 'ERROR';
    SET p_message = 'Internal scheduling error';

    -- Validate time bounds
    IF p_end_time <= p_start_time THEN
        SET p_status_code = 'INVALID_TIME';
        SET p_message = 'End time must be greater than start time';
        LEAVE proc_block;
    END IF;

    -- Fetch student id associated with application
    SELECT student_id INTO v_student_id FROM applications WHERE id = p_application_id;
    IF v_student_id IS NULL THEN
        SET p_status_code = 'APP_NOT_FOUND';
        SET p_message = 'Application ID does not exist';
        LEAVE proc_block;
    END IF;

    -- OSPP & Concurrency: Check Room Conflict using pessimistic row lock
    -- Conflict condition: max(S1, S2) < min(E1, E2) <=> (S1 < E2 AND S2 < E1)
    SELECT COUNT(*) INTO v_conflict_count
    FROM interview_schedules
    WHERE room_id = p_room_id
      AND status = 'scheduled'
      AND (start_time < p_end_time AND end_time > p_start_time)
    FOR UPDATE;

    IF v_conflict_count > 0 THEN
        SET p_status_code = 'ROOM_CONFLICT';
        SET p_message = 'The specified room is already occupied during this time window';
        LEAVE proc_block;
    END IF;

    -- Check Interviewer Conflict
    SELECT COUNT(*) INTO v_conflict_count
    FROM interview_schedules
    WHERE interviewer_id = p_interviewer_id
      AND status = 'scheduled'
      AND (start_time < p_end_time AND end_time > p_start_time)
    FOR UPDATE;

    IF v_conflict_count > 0 THEN
        SET p_status_code = 'INTERVIEWER_CONFLICT';
        SET p_message = 'The specified interviewer has another interview scheduled in this time window';
        LEAVE proc_block;
    END IF;

    -- Check Candidate (Student) Conflict
    SELECT COUNT(*) INTO v_conflict_count
    FROM interview_schedules s
    JOIN applications a ON s.application_id = a.id
    WHERE a.student_id = v_student_id
      AND s.status = 'scheduled'
      AND (s.start_time < p_end_time AND s.end_time > p_start_time)
    FOR UPDATE;

    IF v_conflict_count > 0 THEN
        SET p_status_code = 'CANDIDATE_CONFLICT';
        SET p_message = 'The candidate is already scheduled for another interview in this time window';
        LEAVE proc_block;
    END IF;

    -- If all checks pass: Insert Schedule
    INSERT INTO interview_schedules (
        application_id, round_id, room_id, interviewer_id, start_time, end_time, status
    ) VALUES (
        p_application_id, p_round_id, p_room_id, p_interviewer_id, p_start_time, p_end_time, 'scheduled'
    );

    SET p_schedule_id = LAST_INSERT_ID();
    SET p_status_code = 'SUCCESS';
    SET p_message = 'Interview scheduled successfully without resource conflict';
END$$

DELIMITER ;

-- =====================================================================
-- DATABASE VIEWS
-- =====================================================================

-- View 1: Active Interview Timetable with Joined Metadata
CREATE OR REPLACE VIEW v_active_interview_schedules AS
SELECT 
    s.id AS schedule_id,
    pd.id AS drive_id,
    pd.title AS drive_title,
    c.company_name,
    dr.round_number,
    dr.round_name,
    st.id AS student_id,
    st.usn_roll,
    CONCAT(st.first_name, ' ', st.last_name) AS student_name,
    r.id AS room_id,
    r.room_number,
    r.building_name,
    i.id AS interviewer_id,
    i.full_name AS interviewer_name,
    s.start_time,
    s.end_time,
    s.status AS schedule_status
FROM interview_schedules s
JOIN applications a ON s.application_id = a.id
JOIN students st ON a.student_id = st.id
JOIN drive_rounds dr ON s.round_id = dr.id
JOIN placement_drives pd ON dr.drive_id = pd.id
JOIN companies c ON pd.company_id = c.id
JOIN rooms r ON s.room_id = r.id
JOIN interviewers i ON s.interviewer_id = i.id;

-- View 2: Room Utilization Summary
CREATE OR REPLACE VIEW v_room_utilization_summary AS
SELECT 
    r.id AS room_id,
    r.room_number,
    r.building_name,
    r.room_type,
    r.capacity,
    COUNT(s.id) AS total_scheduled_sessions,
    IFNULL(SUM(TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time)), 0) AS total_occupied_minutes
FROM rooms r
LEFT JOIN interview_schedules s ON r.id = s.room_id AND s.status IN ('scheduled', 'in_progress', 'completed')
GROUP BY r.id, r.room_number, r.building_name, r.room_type, r.capacity;

-- View 3: Student Placement Summary
CREATE OR REPLACE VIEW v_student_placement_summary AS
SELECT 
    st.id AS student_id,
    st.usn_roll,
    CONCAT(st.first_name, ' ', st.last_name) AS full_name,
    d.code AS department_code,
    st.cgpa,
    COUNT(a.id) AS total_applications,
    SUM(CASE WHEN a.status = 'selected' THEN 1 ELSE 0 END) AS offers_received
FROM students st
JOIN departments d ON st.dept_id = d.id
LEFT JOIN applications a ON st.id = a.student_id
GROUP BY st.id, st.usn_roll, st.first_name, st.last_name, d.code, st.cgpa;
