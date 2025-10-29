import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);

/**
 * Accepts:
 *  - "DD/MM/YYYY"
 *  - "DD-MM-YYYY"
 *  - "MM/DD/YYYY"
 *  - "YYYY-MM-DD"
 *  - JS Date object
 * Returns JS Date object or null
 */
export const parseDateQuery = (input) => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input) ? null : input;

  const s = String(input).trim();
  // try strict formats first:
  let d = dayjs(s, ['DD/MM/YYYY', 'DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
  if (!d.isValid()) d = dayjs(s); // fallback generic parse (ISO)
  return d.isValid() ? d.toDate() : null;
};

export const formatDateTimeReadable = (d) => {
  if (!d) return '';
  return dayjs(d).format('DD-MM-YYYY HH:mm');
};
