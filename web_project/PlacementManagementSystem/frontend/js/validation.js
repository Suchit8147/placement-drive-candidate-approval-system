/**
 * Web Technology Engine - Implementation 1: Reusable Client-Side Form Validation Module
 */

const FormValidator = {
  // Check required text
  isRequired(value, fieldName = 'Field') {
    if (!value || typeof value !== 'string' || !value.trim()) {
      return { valid: false, message: `${fieldName} is required.` };
    }
    return { valid: true, message: `${fieldName} is valid.` };
  },

  // Email format regex
  isValidEmail(email) {
    if (!email || !email.trim()) {
      return { valid: false, message: 'Email address is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Please enter a valid email format (e.g., student@college.edu).' };
    }
    return { valid: true, message: 'Email format is valid.' };
  },

  // Password rules
  isValidPassword(password, minLength = 6) {
    if (!password) {
      return { valid: false, message: 'Password is required.' };
    }
    if (password.length < minLength) {
      return { valid: false, message: `Password must be at least ${minLength} characters.` };
    }
    return { valid: true, message: 'Password meets length requirements.' };
  },

  // Numeric range (e.g. CGPA 0 to 10)
  isNumericInRange(value, min, max, fieldName = 'Value') {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, message: `${fieldName} must be a valid number.` };
    }
    if (num < min || num > max) {
      return { valid: false, message: `${fieldName} must be between ${min} and ${max}.` };
    }
    return { valid: true, message: `${fieldName} (${num}) is valid.` };
  },

  // Time window: End time must be after start time
  isValidTimeWindow(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime())) {
      return { valid: false, message: 'Start time is invalid or missing.' };
    }
    if (isNaN(end.getTime())) {
      return { valid: false, message: 'End time is invalid or missing.' };
    }
    if (end <= start) {
      return { valid: false, message: 'End time must be strictly greater than start time.' };
    }
    const durationMinutes = Math.round((end - start) / 60000);
    return { valid: true, message: `Valid time window (Duration: ${durationMinutes} minutes).` };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormValidator;
}
