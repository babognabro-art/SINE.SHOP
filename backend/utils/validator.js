const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  // Accepte +XX XXX XXX XXX ou simplement le numéro
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const validatePassword = (password) => {
  // Au moins 6 caractères
  if (password.length < 6) return false;
  
  // Vérifier la complexité (optionnel)
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  // Au moins 2 critères sur 3
  const criteria = [hasUpperCase, hasLowerCase, hasNumber];
  const metCriteria = criteria.filter(Boolean).length;
  
  return metCriteria >= 2;
};

const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validateObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

const validatePrice = (price) => {
  return typeof price === 'number' && price >= 0 && !isNaN(price);
};

const validateQuantity = (quantity) => {
  return typeof quantity === 'number' && quantity > 0 && Number.isInteger(quantity);
};

const validateDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

const validateFutureDate = (date) => {
  if (!validateDate(date)) return false;
  return new Date(date) > new Date();
};

const validatePastDate = (date) => {
  if (!validateDate(date)) return false;
  return new Date(date) < new Date();
};

const validateEnum = (value, enumValues) => {
  return enumValues.includes(value);
};

const validateString = (value, minLength = 1, maxLength = 1000) => {
  if (typeof value !== 'string') return false;
  return value.length >= minLength && value.length <= maxLength;
};

const validateArray = (value, minLength = 0, maxLength = Infinity) => {
  if (!Array.isArray(value)) return false;
  return value.length >= minLength && value.length <= maxLength;
};

const validateObject = (value) => {
  return value && typeof value === 'object' && !Array.isArray(value);
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  validateURL,
  validateObjectId,
  validatePrice,
  validateQuantity,
  validateDate,
  validateFutureDate,
  validatePastDate,
  validateEnum,
  validateString,
  validateArray,
  validateObject,
};