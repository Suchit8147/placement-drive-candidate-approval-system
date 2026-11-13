-- =====================================================================
-- DBMS Implementation 2: Trigger
-- Purpose: Automatically creates a Notification record when an Application status changes
-- =====================================================================

USE placement_management;

DROP TRIGGER IF EXISTS trg_application_status_notification;

DELIMITER $$

CREATE TRIGGER trg_application_status_notification
AFTER UPDATE ON Applications
FOR EACH ROW
BEGIN
    DECLARE v_student_user_id INT;
    DECLARE v_drive_title VARCHAR(150);
    DECLARE v_company_name VARCHAR(150);
    
    -- Fire only when the status actually changes
    IF OLD.status <> NEW.status THEN
        -- Retrieve student's user_id, drive title, and company name
        SELECT s.user_id, pd.title, c.company_name
        INTO v_student_user_id, v_drive_title, v_company_name
        FROM Students s
        JOIN PlacementDrives pd ON pd.id = NEW.drive_id
        JOIN Companies c ON c.id = pd.company_id
        WHERE s.id = NEW.student_id;
        
        -- Insert automated notification record into Notifications table
        INSERT INTO Notifications (user_id, title, message, status, created_at)
        VALUES (
            v_student_user_id,
            CONCAT('Application Status Updated: ', v_drive_title),
            CONCAT('Your application for ', v_company_name, ' (', v_drive_title, ') status has been updated to: ', UPPER(NEW.status), '.'),
            'unread',
            CURRENT_TIMESTAMP
        );
    END IF;
END$$

DELIMITER ;
