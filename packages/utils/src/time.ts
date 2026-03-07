/**
 * Formats a given date into a 12-hour time string with AM/PM.
 *
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted time in "h:mm am/pm" format.
 *
 * @example
 * const date = new Date('2023-02-19T14:30:00');
 * console.log(formatHourTime(date)); // "2:30pm"
 */
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

/**
 * Formats a date range (start and end date) into a readable time range string.
 *
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {string} The formatted time range in "h:mm am/pm - h:mm am/pm" format.
 *
 * @example
 * const start = new Date('2023-02-19T09:00:00');
 * const end = new Date('2023-02-19T17:00:00');
 * console.log(formatTimeRange(start, end)); // "9:00am - 5:00pm"
 */
export const formatTimeRange = (startDate: Date, endDate: Date) => {
  const start = formatHourTime(startDate);
  const end = formatHourTime(endDate);
  return `${start} - ${end}`;
};

/**
 * Formats a date range (start and end date) into a readable date range string.
 *
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {string} The formatted date range in "Jan 1 - Jan 15, 2024" format.
 *
 * @example
 * const start = new Date('2024-01-01');
 * const end = new Date('2024-01-15');
 * console.log(formatDateRange(start, end)); // "Jan 1 - Jan 15, 2024"
 */
export const formatDateRange = (startDate: Date, endDate: Date) => {
  const start = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} - ${end}`;
};

/**
 * Formats a date into a readable date-time string with timezone adjustment.
 * Creates a new Date object adjusted by 1 day and formats it.
 *
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date-time in "MMM D, YYYY, h:mm AM/PM" format.
 *
 * @example
 * const date = new Date('2023-02-19T14:30:00');
 * console.log(formatDateTime(date)); // "Feb 20, 2023, 2:30 PM"
 */
export const formatDateTime = (date: Date) => {
  // Create a new Date object 5 hours behind the original
  const adjustedDate = new Date(date.getTime());
  adjustedDate.setDate(adjustedDate.getDate() + 1);

  return adjustedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Formats a date into a simple date string with timezone adjustment.
 * Creates a new Date object adjusted by 1 day and formats it.
 *
 * @param {string | Date} start_datetime - The date to format.
 * @returns {string} The formatted date string.
 *
 * @example
 * const date = new Date('2023-02-19');
 * console.log(getFormattedDate(date)); // "2/20/2023"
 */
export const getFormattedDate = (start_datetime: string | Date) => {
  const date = new Date(start_datetime);
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString();
};
