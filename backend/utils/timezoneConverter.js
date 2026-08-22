const SUPPORTED_TIMEZONES = [
  'Africa/Dakar',
  'Africa/Abidjan',
  'Africa/Casablanca',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
];

const getCurrentTimeInTimezone = (timezone) => {
  try {
    const now = new Date();
    return now.toLocaleString('fr-FR', { timeZone: timezone });
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`);
    return new Date().toLocaleString('fr-FR');
  }
};

const formatTimeInTimezone = (date, timezone) => {
  try {
    return new Date(date).toLocaleString('fr-FR', { timeZone: timezone });
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`);
    return new Date(date).toLocaleString('fr-FR');
  }
};

const getTimezoneOffset = (timezone) => {
  try {
    const now = new Date();
    const dateString = now.toLocaleString('fr-FR', { timeZone: timezone });
    const localDate = new Date(dateString);
    const offset = (localDate - now) / (60 * 60 * 1000);
    return offset;
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`);
    return 0;
  }
};

const getTimezonesByCountry = (country) => {
  const timezoneMap = {
    'SN': ['Africa/Dakar'],
    'CI': ['Africa/Abidjan'],
    'MA': ['Africa/Casablanca'],
    'NG': ['Africa/Lagos'],
    'KE': ['Africa/Nairobi'],
    'ZA': ['Africa/Johannesburg'],
    'FR': ['Europe/Paris'],
    'GB': ['Europe/London'],
    'US': ['America/New_York', 'America/Los_Angeles', 'America/Chicago'],
    'CA': ['America/Toronto'],
    'AE': ['Asia/Dubai'],
    'JP': ['Asia/Tokyo'],
    'CN': ['Asia/Shanghai'],
    'SG': ['Asia/Singapore'],
    'IN': ['Asia/Kolkata'],
    'AU': ['Australia/Sydney'],
  };
  
  return timezoneMap[country] || ['UTC'];
};

const getCountryFromTimezone = (timezone) => {
  const countryMap = {
    'Africa/Dakar': 'SN',
    'Africa/Abidjan': 'CI',
    'Africa/Casablanca': 'MA',
    'Africa/Lagos': 'NG',
    'Africa/Nairobi': 'KE',
    'Africa/Johannesburg': 'ZA',
    'Europe/Paris': 'FR',
    'Europe/London': 'GB',
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'America/Chicago': 'US',
    'America/Toronto': 'CA',
    'Asia/Dubai': 'AE',
    'Asia/Tokyo': 'JP',
    'Asia/Shanghai': 'CN',
    'Asia/Singapore': 'SG',
    'Asia/Kolkata': 'IN',
    'Australia/Sydney': 'AU',
  };
  
  return countryMap[timezone] || 'UNKNOWN';
};

module.exports = {
  SUPPORTED_TIMEZONES,
  getCurrentTimeInTimezone,
  formatTimeInTimezone,
  getTimezoneOffset,
  getTimezonesByCountry,
  getCountryFromTimezone,
};