const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initMySQL() {
  console.log('=====================================================================');
  console.log('  Connecting to XAMPP MySQL Server...');
  console.log('=====================================================================');

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;

  let connection;
  try {
    connection = await mysql.createConnection({ host, user, password, port, multipleStatements: true });
    console.log(`✓ Connected to MySQL server at ${host}:${port} as '${user}'`);
  } catch (err) {
    console.error('❌ Failed to connect to MySQL in XAMPP:');
    console.error('   Error:', err.message);
    console.error('\n👉 Please make sure:');
    console.error('   1. Open the XAMPP Control Panel.');
    console.error('   2. Click the "Start" button next to MySQL (and Apache).');
    console.error('   3. Ensure MySQL port is 3306 and status is green.');
    process.exit(1);
  }

  try {
    // 1. Run database_schema.sql
    console.log('\n[1/4] Creating database "placement_management" and 11 tables...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'database_schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('✓ Tables created successfully.');

    // 2. Run stored_procedure.sql
    console.log('\n[2/4] Creating stored procedure: sp_update_application_status...');
    await connection.query('USE placement_management;');
    await connection.query('DROP PROCEDURE IF EXISTS sp_update_application_status;');
    const procSql = `
      CREATE PROCEDURE sp_update_application_status (
          IN p_application_id INT,
          IN p_new_status VARCHAR(20),
          IN p_remarks VARCHAR(255),
          OUT p_rows_affected INT,
          OUT p_message VARCHAR(255)
      )
      BEGIN
          DECLARE v_exists INT DEFAULT 0;
          SELECT COUNT(*) INTO v_exists FROM Applications WHERE id = p_application_id;
          IF v_exists = 0 THEN
              SET p_rows_affected = 0;
              SET p_message = CONCAT('Error: Application ID ', p_application_id, ' does not exist.');
          ELSEIF p_new_status NOT IN ('applied', 'shortlisted', 'in_progress', 'selected', 'rejected') THEN
              SET p_rows_affected = 0;
              SET p_message = CONCAT('Error: Invalid status: ', p_new_status);
          ELSE
              UPDATE Applications 
              SET status = p_new_status, updated_at = CURRENT_TIMESTAMP
              WHERE id = p_application_id;
              SET p_rows_affected = ROW_COUNT();
              SET p_message = CONCAT('Success: Application #', p_application_id, ' status updated to ', p_new_status);
          END IF;
      END;
    `;
    await connection.query(procSql);
    console.log('✓ Stored procedure created successfully.');

    // 3. Run trigger.sql
    console.log('\n[3/4] Creating trigger: trg_application_status_notification...');
    await connection.query('DROP TRIGGER IF EXISTS trg_application_status_notification;');
    const triggerSql = `
      CREATE TRIGGER trg_application_status_notification
      AFTER UPDATE ON Applications
      FOR EACH ROW
      BEGIN
          DECLARE v_student_user_id INT;
          DECLARE v_drive_title VARCHAR(150);
          DECLARE v_company_name VARCHAR(150);
          
          IF OLD.status <> NEW.status THEN
              SELECT s.user_id, pd.title, c.company_name
              INTO v_student_user_id, v_drive_title, v_company_name
              FROM Students s
              JOIN PlacementDrives pd ON pd.id = NEW.drive_id
              JOIN Companies c ON c.id = pd.company_id
              WHERE s.id = NEW.student_id;
              
              INSERT INTO Notifications (user_id, title, message, status, created_at)
              VALUES (
                  v_student_user_id,
                  CONCAT('Application Status Updated: ', v_drive_title),
                  CONCAT('Your application for ', v_company_name, ' (', v_drive_title, ') status has been updated to: ', UPPER(NEW.status), '.'),
                  'unread',
                  CURRENT_TIMESTAMP
              );
          END IF;
      END;
    `;
    await connection.query(triggerSql);
    console.log('✓ Trigger created successfully.');

    // 4. Run seed_data.sql
    console.log('\n[4/4] Inserting initial test seed records for all 11 tables...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed_data.sql'), 'utf-8');
    await connection.query(seedSql);
    console.log('✓ Seed data inserted successfully.');

    console.log('\n=====================================================================');
    console.log('  🎉 XAMPP MySQL Database Setup Complete!');
    console.log('  Database: placement_management');
    console.log('  phpMyAdmin URL: http://localhost/phpmyadmin/');
    console.log('=====================================================================');
  } catch (err) {
    console.error('❌ Error during database initialization:', err.message);
  } finally {
    await connection.end();
  }
}

initMySQL();
