const express = require('express');
const router = express.Router();

const studentController = require('../controllers/studentController');
const companyController = require('../controllers/companyController');
const driveController = require('../controllers/driveController');
const applicationController = require('../controllers/applicationController');
const interviewController = require('../controllers/interviewController');
const roomController = require('../controllers/roomController');
const resultController = require('../controllers/resultController');
const notificationController = require('../controllers/notificationController');
const placementController = require('../controllers/placementController');

// ==========================================
// 1. System Overview & Diagnostics
// ==========================================
router.get('/overview', placementController.getSystemOverview);
router.get('/users', placementController.getAllUsers);
router.post('/reconnect-db', placementController.reconnectDB);

// ==========================================
// 2. Student Management
// ==========================================
router.get('/students', studentController.getAllStudents);
router.get('/students/:id', studentController.getStudentById);
router.post('/students', studentController.createStudent);
router.put('/students/:id', studentController.updateStudent);
router.delete('/students/:id', studentController.deleteStudent);

// ==========================================
// 3. Company Management
// ==========================================
router.get('/companies', companyController.getAllCompanies);
router.get('/companies/:id', companyController.getCompanyById);
router.post('/companies', companyController.createCompany);
router.put('/companies/:id', companyController.updateCompany);
router.delete('/companies/:id', companyController.deleteCompany);

// ==========================================
// 4. Placement Drive Management
// ==========================================
router.get('/drives', driveController.getAllDrives);
router.get('/drives/:id', driveController.getDriveById);
router.post('/drives', driveController.createDrive);
router.put('/drives/:id', driveController.updateDrive);
router.delete('/drives/:id', driveController.deleteDrive);

// Interview Rounds
router.get('/rounds', driveController.getAllRounds);
router.get('/rounds/:id', driveController.getRoundById);
router.post('/rounds', driveController.createRound);
router.put('/rounds/:id', driveController.updateRound);
router.delete('/rounds/:id', driveController.deleteRound);

// ==========================================
// 5. Application Management
// ==========================================
router.get('/applications', applicationController.getAllApplications);
router.get('/applications/:id', applicationController.getApplicationById);
router.post('/applications', applicationController.applyForDrive);
router.post('/apply', applicationController.applyForDrive); // legacy endpoint
router.put('/applications/:id/status', applicationController.updateApplicationStatus);
router.delete('/applications/:id', applicationController.deleteApplication);

// ==========================================
// 6. Interviewer Management
// ==========================================
router.get('/interviewers', interviewController.getAllInterviewers);
router.get('/interviewers/:id', interviewController.getInterviewerById);
router.post('/interviewers', interviewController.createInterviewer);
router.put('/interviewers/:id', interviewController.updateInterviewer);
router.delete('/interviewers/:id', interviewController.deleteInterviewer);

// ==========================================
// 7. Room Management & Spatial Availability
// ==========================================
router.get('/rooms', roomController.getAllRooms);
router.get('/rooms/:id', roomController.getRoomById);
router.post('/rooms', roomController.createRoom);
router.put('/rooms/:id', roomController.updateRoom);
router.delete('/rooms/:id', roomController.deleteRoom);
router.post('/rooms/check-availability', roomController.checkAvailability);

// ==========================================
// 8. Interview Schedule Management
// ==========================================
router.get('/schedules', interviewController.getAllSchedules);
router.post('/schedules', interviewController.createSchedule);
router.put('/schedules/:id', interviewController.updateSchedule);
router.delete('/schedules/:id', interviewController.deleteSchedule);

// ==========================================
// 9. Results Management
// ==========================================
router.get('/results', resultController.getAllResults);
router.get('/results/:id', resultController.getResultById);
router.post('/results', resultController.createResult);
router.put('/results/:id', resultController.updateResult);
router.delete('/results/:id', resultController.deleteResult);

// ==========================================
// 10. Notification Management
// ==========================================
router.get('/notifications', notificationController.getAllNotifications);
router.get('/notifications/:id', notificationController.getNotificationById);
router.post('/notifications', notificationController.createNotification);
router.put('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications/:id', notificationController.deleteNotification);

module.exports = router;
