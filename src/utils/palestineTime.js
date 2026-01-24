/**
 * Palestine Timezone Utilities
 * Palestine uses EET (UTC+2) and EEST (UTC+3) during daylight saving
 */

/**
 * Convert a date to Palestine timezone and set time to end of day (11:59:59 PM)
 * @param {Date|string} date - The date to convert
 * @returns {Date} - Date object with Palestine timezone at 11:59:59 PM
 */
export const toPalestineEndOfDay = (date) => {
  const inputDate = new Date(date);
  
  // Format date as YYYY-MM-DD to ensure we're working with the correct day
  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  
  // Create date string in Palestine timezone at 11:59:59 PM
  // Palestine timezone is Asia/Gaza or Asia/Hebron
  const dateString = `${year}-${month}-${day}T23:59:59`;
  
  // Create a date object and adjust for Palestine timezone
  const palestineDate = new Date(dateString);
  
  return palestineDate;
};

/**
 * Get current time in Palestine timezone
 * @returns {Date} - Current date/time in Palestine timezone
 */
export const getPalestineNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Gaza' }));
};

/**
 * Check if a date has expired (compared to Palestine time)
 * @param {Date|string} expiryDate - The expiry date to check
 * @returns {boolean} - True if expired, false otherwise
 */
export const isExpiredInPalestine = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const now = getPalestineNow();
  return expiry < now;
};

/**
 * Format date in Palestine timezone
 * @param {Date|string} date - The date to format
 * @param {string} locale - Locale for formatting (default: 'ar-PS')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatPalestineDate = (date, locale = 'ar-PS', options = {}) => {
  const defaultOptions = {
    timeZone: 'Asia/Gaza',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  
  return new Date(date).toLocaleString(locale, defaultOptions);
};

/**
 * Get time remaining until a date expires (in Palestine timezone)
 * @param {Date|string} expiryDate - The expiry date
 * @returns {object} - Object with days, hours, minutes, seconds
 */
export const getTimeRemaining = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const now = getPalestineNow();
  const difference = expiry - now;
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, expired: false };
};
