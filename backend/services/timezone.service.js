const { SUPPORTED_TIMEZONES, getCurrentTimeInTimezone, formatTimeInTimezone, getTimezoneOffset } = require('../utils/timezoneConverter');

class TimezoneService {
  static getSupportedTimezones() {
    return SUPPORTED_TIMEZONES;
  }

  static getCurrentTime(timezone) {
    return getCurrentTimeInTimezone(timezone);
  }

  static formatTime(date, timezone) {
    return formatTimeInTimezone(date, timezone);
  }

  static getOffset(timezone) {
    return getTimezoneOffset(timezone);
  }

  static getUserTimezone(user) {
    return user.timezone || 'Africa/Dakar';
  }

  static convertUserTime(date, user) {
    const timezone = this.getUserTimezone(user);
    return this.formatTime(date, timezone);
  }

  static getTimezonesByRegion(region) {
    const regions = {
      africa: ['Africa/Dakar', 'Africa/Abidjan', 'Africa/Casablanca', 'Africa/Lagos', 'Africa/Nairobi'],
      europe: ['Europe/Paris', 'Europe/London', 'Europe/Berlin'],
      america: ['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Toronto'],
      asia: ['Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore'],
      oceania: ['Australia/Sydney', 'Australia/Melbourne'],
    };
    return regions[region.toLowerCase()] || [];
  }
}

module.exports = TimezoneService;