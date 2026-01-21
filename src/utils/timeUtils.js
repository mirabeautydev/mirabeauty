/**
 * Time Utility Functions
 * Handles conversion between 24-hour and 12-hour time formats
 */

/**
 * Convert 24-hour time to 12-hour format (without AM/PM)
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30")
 * @returns {string} Time in 12-hour format (e.g., "2:30")
 */
export const convert24To12Hour = (time24) => {
  if (!time24 || typeof time24 !== 'string') return time24;
  
  const [hours, minutes] = time24.split(':');
  let hour = parseInt(hours, 10);
  
  // Convert to 12-hour format
  if (hour === 0) {
    hour = 12; // Midnight
  } else if (hour > 12) {
    hour = hour - 12; // PM hours
  }
  // hour === 12 stays as 12 (noon)
  // hours 1-11 stay the same (AM)
  
  return `${hour}:${minutes}`;
};

/**
 * Convert 12-hour time to 24-hour format
 * Assumes all times are between 8:00 AM and 4:30 PM
 * @param {string} time12 - Time in 12-hour format (e.g., "2:30")
 * @returns {string} Time in 24-hour format (e.g., "14:30")
 */
export const convert12To24Hour = (time12) => {
  if (!time12 || typeof time12 !== 'string') return time12;
  
  const [hours, minutes] = time12.split(':');
  let hour = parseInt(hours, 10);
  
  // Since business hours are 8am-4:30pm:
  // - Hours 8-11 are AM (stay the same)
  // - Hour 12 is PM (stays 12)
  // - Hours 1-4 are PM (add 12)
  
  if (hour >= 1 && hour <= 4) {
    // 1:00-4:30 PM → 13:00-16:30
    hour = hour + 12;
  }
  // Hours 8-12 stay the same
  
  return `${String(hour).padStart(2, '0')}:${minutes}`;
};

/**
 * Format time for display (currently just passes through convert24To12Hour)
 * @param {string} time24 - Time in 24-hour format
 * @returns {string} Formatted time string
 */
export const formatTimeDisplay = (time24) => {
  return convert24To12Hour(time24);
};
