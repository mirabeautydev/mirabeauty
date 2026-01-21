// Date helper functions

/**
 * Formats a Firestore timestamp or regular date to a localized date string
 * @param {*} timestamp - Firestore timestamp or Date object
 * @param {string} locale - Locale string (default: 'en-US')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatFirestoreDate = (timestamp, locale = 'en-US', options = {}) => {
  if (!timestamp) return 'Invalid Date';
  
  try {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString(locale, options);
    }
    
    // Handle Firestore Timestamp with seconds property
    if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString(locale, options);
    }
    
    // Handle regular Date objects or date strings
    return new Date(timestamp).toLocaleDateString(locale, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats a Firestore timestamp to a localized date and time string
 * @param {*} timestamp - Firestore timestamp or Date object
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date and time string
 */
export const formatFirestoreDateTime = (timestamp, locale = 'en-US') => {
  return formatFirestoreDate(timestamp, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};