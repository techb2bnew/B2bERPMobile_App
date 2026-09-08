import { TASK_FILTER_DONE } from '../constants/Constants';
import { normalizeTaskDateKey } from './projectUtils';

// Mirrors the KPI thresholds/colors already agreed for the web app's
// Performance view (src/lib/performanceKpi.ts) so both platforms read the
// same numbers the same way.
export const KPI_SEVERITY_GOOD = 'good';
export const KPI_SEVERITY_WATCH = 'watch';
export const KPI_SEVERITY_ATTENTION = 'attention';

const GOOD_THRESHOLD = 85;
const WATCH_THRESHOLD = 70;

export const kpiSeverity = percent => {
  if (percent >= GOOD_THRESHOLD) return KPI_SEVERITY_GOOD;
  if (percent >= WATCH_THRESHOLD) return KPI_SEVERITY_WATCH;
  return KPI_SEVERITY_ATTENTION;
};

export const KPI_SEVERITY_COLORS = {
  [KPI_SEVERITY_GOOD]: '#10b981',
  [KPI_SEVERITY_WATCH]: '#f59e0b',
  [KPI_SEVERITY_ATTENTION]: '#f43f5e',
};

export const buildMonthKey = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

export const monthLabel = (year, monthIndex) =>
  new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/** Attendance meter: % of the month's days that are payable (present, paid leave, weekly off, half-credit for half/short days). */
export const computeAttendanceMeter = (summary, daysInMonth) => {
  const payableDays = Number(summary?.payableDays) || 0;
  const percent = daysInMonth > 0 ? (payableDays / daysInMonth) * 100 : 0;
  return { percent, severity: kpiSeverity(percent), payableDays, daysInMonth };
};

/** Shift Time meter: hours actually logged vs a flat 8h/worked-day target — built from hrmsService's per-day `dayWise` map. */
export const computeShiftMeter = dayWise => {
  const workedDays = Object.values(dayWise || {}).filter(day => Number(day.hours) > 0);
  const totalHours = workedDays.reduce((sum, day) => sum + (Number(day.hours) || 0), 0);
  const totalDays = workedDays.length;
  const expectedHours = totalDays * 8;
  const percent = expectedHours > 0 ? Math.min(100, (totalHours / expectedHours) * 100) : 0;
  return { percent, severity: kpiSeverity(percent), totalHours, totalDays, expectedHours };
};

/** Daily worked-hours series (for the bar chart) — one point per calendar day of the month, 0 where nothing was logged. */
export const buildDailyShiftPoints = (dayWise, datesList = []) =>
  datesList.map((dateKey, index) => ({
    date: dateKey,
    day: index + 1,
    value: Math.round((Number(dayWise?.[dateKey]?.hours) || 0) * 100) / 100,
  }));

const taskIsAssignedTo = (task, employeeId) =>
  task.assigneeId === employeeId || (task.assigneeIds || []).includes(employeeId);

/** Task Completion meter: tasks due within the given month for one employee. */
export const computeTaskCompletionMeter = (tasks, employeeId, monthKey) => {
  const inMonth = (tasks || []).filter(task => {
    if (!taskIsAssignedTo(task, employeeId)) {
      return false;
    }
    const dueKey = normalizeTaskDateKey(task.dueDate);
    return Boolean(dueKey) && dueKey.slice(0, 7) === monthKey;
  });

  const done = inMonth.filter(task => task.status === TASK_FILTER_DONE);
  const total = inMonth.length;
  const percent = total > 0 ? (done.length / total) * 100 : 0;

  return { percent, severity: kpiSeverity(percent), total, done: done.length };
};
