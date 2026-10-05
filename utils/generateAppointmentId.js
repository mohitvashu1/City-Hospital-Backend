const generateAppointmentId = () => {
  const timestamp = Date.now();

  return `APT-${timestamp}`;
};

export default generateAppointmentId;