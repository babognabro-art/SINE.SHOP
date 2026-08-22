exports.generateReservationNumber = () => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RES-${random}`;
};
const generateReservationNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `RES-${year}-${random}`;
};

module.exports = generateReservationNumber;