const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim()));

const isAdmin = (telegramId) => {
  return ADMIN_IDS.includes(telegramId);
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
};

const getCurrentYear = () => {
  return new Date().getFullYear().toString();
};

// KRA PIN validator (format: A000000000A)
const isValidKRAPin = (pin) => {
  return /^[A-Z]\d{9}[A-Z]$/.test(pin.toUpperCase());
};

// Mpesa transaction code validator (format: RxxxxxxxxxxxxxxX)
const isValidTxCode = (code) => {
  return /^[A-Z0-9]{10,12}$/.test(code.toUpperCase());
};

module.exports = { isAdmin, formatDate, getCurrentYear, isValidKRAPin, isValidTxCode };
