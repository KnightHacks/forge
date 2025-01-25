export function formatHourTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";

  // Convert hours to 12-hour format
  const formattedHours = hours % 12 || 12;
  // Pad minutes with leading zero if necessary
  const formattedMinutes = minutes.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}${ampm}`;
}

export const formatDateRange = (startDate: Date, endDate: Date) => {
  const start = formatHourTime(startDate);
  const end = formatHourTime(endDate);
  return `${start} - ${end}`;
};
