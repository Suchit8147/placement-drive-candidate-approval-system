-- =====================================================================
-- DBMS Implementation 2: Stored Procedure
-- Purpose: Approve or reject a student application atomically in MySQL
-- =====================================================================

USE placement_management;

DROP PROCEDURE IF EXISTS sp_update_application_status;

DELIMITER $$

CREATE PROCEDURE sp_update_application_status (
    IN p_application_id INT,
    IN p_new_status VARCHAR(20),
    IN p_remarks VARCHAR(255),
    OUT p_rows_affected INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    
    -- Check if application exists
    SELECT COUNT(*) INTO v_exists FROM Applications WHERE id = p_application_id;
    
    IF v_exists = 0 THEN
        SET p_rows_affected = 0;
        SET p_message = CONCAT('Error: Application ID ', p_application_id, ' does not exist.');
    ELSEIF p_new_status NOT IN ('applied', 'shortlisted', 'in_progress', 'selected', 'rejected') THEN
        SET p_rows_affected = 0;
        SET p_message = CONCAT('Error: Invalid status: ', p_new_status);
    ELSE
        -- Update Application Record
        UPDATE Applications 
        SET status = p_new_status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_application_id;
        
        SET p_rows_affected = ROW_COUNT();
        SET p_message = CONCAT('Success: Application #', p_application_id, ' status updated to ', p_new_status);
    END IF;
END$$

DELIMITER ;
