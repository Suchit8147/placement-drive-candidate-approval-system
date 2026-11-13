-- =====================================================================
-- Seed Data for placement_management Database
-- Pre-hashed passwords for bcrypt (rounds=10):
-- Admin@123     -> $2a$10$O0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pXWdK.dKqjE9bO6Y/W0K/6K6
-- Student@123   -> $2a$10$tZ3U7f7T28S8.5N7fHqO0.H5lE8Wd7K9J6qE8Y/W0K/6K6tZ3U7f7
-- Company@123   -> $2a$10$O0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pXWdK.dKqjE9bO6Y/W0K/6K6
-- Panel@123     -> $2a$10$O0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pXWdK.dKqjE9bO6Y/W0K/6K6
-- =====================================================================

USE placement_management;

-- 1. Users
INSERT INTO Users (id, email, password, role) VALUES
(1, 'admin@college.edu', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'admin'),
(2, 'student1@college.edu', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'student'),
(3, 'student2@college.edu', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'student'),
(4, 'student3@college.edu', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'student'),
(5, 'hr@google.com', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'hr'),
(6, 'hr@microsoft.com', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'hr'),
(7, 'interviewer1@college.edu', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'interviewer'),
(8, 'interviewer2@college.edu', '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', 'interviewer');

-- 2. Students
INSERT INTO Students (id, user_id, usn, name, department, cgpa, graduation_year, resume_url, phone, is_eligible) VALUES
(1, 2, '1MS21CS001', 'Aarav Sharma', 'Computer Science', 8.95, 2026, 'https://drive.google.com/resume_aarav.pdf', '9876543210', TRUE),
(2, 3, '1MS21CS042', 'Diya Patel', 'Information Science', 9.15, 2026, 'https://drive.google.com/resume_diya.pdf', '9876543211', TRUE),
(3, 4, '1MS21EC015', 'Rohan Verma', 'Electronics', 7.80, 2026, 'https://drive.google.com/resume_rohan.pdf', '9876543212', TRUE);

-- 3. Companies
INSERT INTO Companies (id, user_id, company_name, industry, website, contact_person, contact_email) VALUES
(1, 5, 'Google India', 'Information Technology', 'https://careers.google.com', 'Sundar R.', 'hr@google.com'),
(2, 6, 'Microsoft IDC', 'Cloud & Software', 'https://careers.microsoft.com', 'Satya N.', 'hr@microsoft.com');

-- 4. PlacementDrives
INSERT INTO PlacementDrives (id, company_id, title, job_role, ctc_lpa, min_cgpa, eligible_branches, drive_date, status) VALUES
(1, 1, 'Google Campus Drive 2026', 'Software Engineer - Level 3', 32.50, 8.00, 'Computer Science, Information Science', '2026-11-20', 'active'),
(2, 2, 'Microsoft Cloud Hiring 2026', 'Cloud Solution Architect', 28.00, 7.50, 'All', '2026-11-25', 'active');

-- 5. InterviewRounds
INSERT INTO InterviewRounds (id, drive_id, round_number, round_name, round_type, pass_score, duration_minutes) VALUES
(1, 1, 1, 'Online Coding Assessment', 'online_test', 70.00, 60),
(2, 1, 2, 'Technical Interview - System Design', 'technical', 75.00, 45),
(3, 1, 3, 'HR Behavioral Round', 'hr', 60.00, 30),
(4, 2, 1, 'Cloud Fundamentals Test', 'online_test', 65.00, 60),
(5, 2, 2, 'Technical Round 1', 'technical', 70.00, 45);

-- 6. Applications
INSERT INTO Applications (id, drive_id, student_id, status, current_round_id) VALUES
(1, 1, 1, 'shortlisted', 2),
(2, 1, 2, 'applied', 1),
(3, 2, 1, 'applied', 4),
(4, 2, 3, 'shortlisted', 5);

-- 7. Rooms (Conflict Resources)
INSERT INTO Rooms (id, room_number, building, floor, capacity, room_type, is_active) VALUES
(1, 'Room-101', 'Placement Block', 1, 1, 'cabin', TRUE),
(2, 'Room-102', 'Placement Block', 1, 1, 'cabin', TRUE),
(3, 'Lab-201', 'Computer Science Block', 2, 40, 'lab', TRUE),
(4, 'Seminar-Hall-A', 'Main Administrative Block', 3, 120, 'hall', TRUE);

-- 8. Interviewers (Conflict Resources)
INSERT INTO Interviewers (id, user_id, employee_code, name, department, designation, specialization) VALUES
(1, 7, 'EMP-CS-01', 'Dr. Ramesh Kumar', 'Computer Science', 'Associate Professor', 'Distributed Systems & Algorithms'),
(2, 8, 'EMP-IS-02', 'Prof. Priya Menon', 'Information Science', 'Assistant Professor', 'Cloud Computing & Databases');

-- 9. InterviewSchedules (Existing Confirmed Slots for Conflict Testing)
INSERT INTO InterviewSchedules (id, application_id, round_id, room_id, interviewer_id, start_time, end_time, status, notes) VALUES
(1, 1, 2, 1, 1, '2026-11-20 10:00:00', '2026-11-20 11:00:00', 'scheduled', 'Google Round 2 Technical - Aarav Sharma'),
(2, 4, 5, 2, 2, '2026-11-20 10:30:00', '2026-11-20 11:30:00', 'scheduled', 'Microsoft Cloud Technical - Rohan Verma');

-- 10. Results
INSERT INTO Results (id, application_id, schedule_id, total_score, decision, remarks) VALUES
(1, 1, 1, 88.50, 'selected', 'Outstanding DSA problem solving and concurrency concepts.');

-- 11. Notifications
INSERT INTO Notifications (id, user_id, title, message, status) VALUES
(1, 2, 'Application Shortlisted', 'Congratulations Aarav! You have been shortlisted for Google Technical Round 2.', 'unread'),
(2, 4, 'Interview Scheduled', 'Your interview for Microsoft Cloud Technical is scheduled in Room-102 at 10:30 AM.', 'unread');
