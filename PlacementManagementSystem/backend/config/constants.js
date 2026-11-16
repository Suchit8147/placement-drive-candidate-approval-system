module.exports = {
  ROLES: {
    ADMIN: 'admin',
    STUDENT: 'student',
    HR: 'hr',
    INTERVIEWER: 'interviewer'
  },
  APP_STATUS: {
    APPLIED: 'applied',
    SHORTLISTED: 'shortlisted',
    IN_PROGRESS: 'in_progress',
    SELECTED: 'selected',
    REJECTED: 'rejected'
  },
  ROOM_TYPES: {
    CABIN: 'cabin',
    LAB: 'lab',
    HALL: 'hall',
    AUDITORIUM: 'auditorium'
  },
  PRIORITY_CONVENTION: {
    LOWER_NUMBER_HIGHER_PRIORITY: true, // Priority 1 > Priority 2
    DESCRIPTION: 'Lower numeric value represents higher priority (e.g. Priority 1 is dispatched before Priority 2)'
  }
};
