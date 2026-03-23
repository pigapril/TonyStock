import {
  Chart as ChartJS,
  _adapters,
  registerables
} from 'chart.js';
import {
  addDays,
  addHours,
  addMilliseconds,
  addMinutes,
  addMonths,
  addQuarters,
  addSeconds,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMilliseconds,
  differenceInMinutes,
  differenceInMonths,
  differenceInQuarters,
  differenceInSeconds,
  differenceInWeeks,
  differenceInYears,
  endOfDay,
  endOfHour,
  endOfMinute,
  endOfMonth,
  endOfQuarter,
  endOfSecond,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parse,
  parseISO,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfQuarter,
  startOfSecond,
  startOfWeek,
  startOfYear,
  toDate
} from 'date-fns';

let isRegistered = false;

const FORMATS = {
  datetime: 'MMM d, yyyy, h:mm:ss aaaa',
  millisecond: 'h:mm:ss.SSS aaaa',
  second: 'h:mm:ss aaaa',
  minute: 'h:mm aaaa',
  hour: 'ha',
  day: 'MMM d',
  week: 'PP',
  month: 'MMM yyyy',
  quarter: 'qqq - yyyy',
  year: 'yyyy'
};

function ensureDateAdapterLoaded() {
  _adapters._date.override({
    _id: 'date-fns',
    formats() {
      return FORMATS;
    },
    parse(value, fmt) {
      if (value === null || typeof value === 'undefined') {
        return null;
      }

      if (typeof value === 'number' || value instanceof Date) {
        value = toDate(value);
      } else if (typeof value === 'string') {
        value = typeof fmt === 'string'
          ? parse(value, fmt, new Date(), this.options)
          : parseISO(value, this.options);
      }

      return isValid(value) ? value.getTime() : null;
    },
    format(time, fmt) {
      return format(time, fmt, this.options);
    },
    add(time, amount, unit) {
      switch (unit) {
        case 'millisecond': return addMilliseconds(time, amount);
        case 'second': return addSeconds(time, amount);
        case 'minute': return addMinutes(time, amount);
        case 'hour': return addHours(time, amount);
        case 'day': return addDays(time, amount);
        case 'week': return addWeeks(time, amount);
        case 'month': return addMonths(time, amount);
        case 'quarter': return addQuarters(time, amount);
        case 'year': return addYears(time, amount);
        default: return time;
      }
    },
    diff(max, min, unit) {
      switch (unit) {
        case 'millisecond': return differenceInMilliseconds(max, min);
        case 'second': return differenceInSeconds(max, min);
        case 'minute': return differenceInMinutes(max, min);
        case 'hour': return differenceInHours(max, min);
        case 'day': return differenceInDays(max, min);
        case 'week': return differenceInWeeks(max, min);
        case 'month': return differenceInMonths(max, min);
        case 'quarter': return differenceInQuarters(max, min);
        case 'year': return differenceInYears(max, min);
        default: return 0;
      }
    },
    startOf(time, unit, weekday) {
      switch (unit) {
        case 'second': return startOfSecond(time);
        case 'minute': return startOfMinute(time);
        case 'hour': return startOfHour(time);
        case 'day': return startOfDay(time);
        case 'week': return startOfWeek(time);
        case 'isoWeek': return startOfWeek(time, { weekStartsOn: +weekday });
        case 'month': return startOfMonth(time);
        case 'quarter': return startOfQuarter(time);
        case 'year': return startOfYear(time);
        default: return time;
      }
    },
    endOf(time, unit) {
      switch (unit) {
        case 'second': return endOfSecond(time);
        case 'minute': return endOfMinute(time);
        case 'hour': return endOfHour(time);
        case 'day': return endOfDay(time);
        case 'week': return endOfWeek(time);
        case 'month': return endOfMonth(time);
        case 'quarter': return endOfQuarter(time);
        case 'year': return endOfYear(time);
        default: return time;
      }
    }
  });
}

export function ensureHomeChartsRegistered() {
  if (isRegistered) {
    return;
  }

  ensureDateAdapterLoaded();
  ChartJS.register(...registerables);
  isRegistered = true;
}
