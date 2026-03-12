// ========================================
// VALIDATION HELPERS
// Reusable validation functions
// ========================================

/**
 * Validate Uganda phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
exports.isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10,12}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate Uganda National ID (NIN)
 * @param {string} nin - NIN to validate
 * @returns {boolean} - True if valid
 */
exports.isValidNIN = (nin) => {
  const ninRegex = /^[A-Z0-9]{14}$/;
  return ninRegex.test(nin);
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate produce name
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
exports.isValidProduceName = (name) => {
  const nameRegex = /^[A-Za-z0-9 ]+$/;
  return name && name.length >= 2 && nameRegex.test(name);
};

/**
 * Validate produce type
 * @param {string} type - Type to validate
 * @returns {boolean} - True if valid
 */
exports.isValidProduceType = (type) => {
  const typeRegex = /^[A-Za-z ]+$/;
  return type && type.length >= 2 && typeRegex.test(type);
};

/**
 * Validate name (alphanumeric)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
exports.isValidName = (name) => {
  const nameRegex = /^[A-Za-z0-9 ]+$/;
  return name && name.length >= 2 && nameRegex.test(name);
};

/**
 * Validate tonnage
 * @param {number} tonnage - Tonnage to validate
 * @returns {boolean} - True if valid
 */
exports.isValidTonnage = (tonnage) => {
  return tonnage && tonnage >= 1000;
};

/**
 * Validate amount
 * @param {number} amount - Amount to validate
 * @param {number} min - Minimum amount
 * @returns {boolean} - True if valid
 */
exports.isValidAmount = (amount, min = 10000) => {
  return amount && amount >= min;
};

/**
 * Validate date is in future
 * @param {Date} date - Date to validate
 * @returns {boolean} - True if in future
 */
exports.isFutureDate = (date) => {
  return new Date(date) > new Date();
};

/**
 * Validate MongoDB ID
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid
 */
exports.isValidObjectId = (id) => {
  return id.match(/^[0-9a-fA-F]{24}$/);
};

/**
 * Sanitize input - remove HTML tags
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
exports.sanitizeInput = (input) => {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').trim();
};