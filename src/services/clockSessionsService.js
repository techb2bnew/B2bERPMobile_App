import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const CLOCK_SESSIONS_TABLE = 'clock_sessions';
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SHORT_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MAX_DAILY_HOURS_FOR_BAR = 8;

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayBounds = dateKey => {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${dateKey}T23:59:59.999`);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const getCurrentWeekRange = () => {
  const weekDays = buildCurrentWeekDays();
  return {
    startDateKey: weekDays[0].dateKey,
    endDateKey: weekDays[weekDays.length - 1].dateKey,
  };
};

const formatDateLong = dateKey =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatDateShort = dateKey =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const countDaysInRange = (startDateKey, endDateKey) => {
  const start = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${endDateKey}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
};

export const getDateRangeDisplay = (startDateKey, endDateKey, isCurrentWeek = false) => {
  const dayCount = countDaysInRange(startDateKey, endDateKey);
  const dayCountLabel = dayCount === 1 ? '1 day' : `${dayCount} days`;
  const isSingleDay = startDateKey === endDateKey;

  if (isCurrentWeek) {
    return {
      title: 'This Week',
      fromLabel: formatDateLong(startDateKey),
      toLabel: formatDateLong(endDateKey),
      dayCountLabel,
      isSingleDay: false,
      showRange: true,
    };
  }

  if (isSingleDay) {
    return {
      title: formatDateLong(startDateKey),
      fromLabel: null,
      toLabel: null,
      dayCountLabel,
      isSingleDay: true,
      showRange: false,
    };
  }

  return {
    title: 'Selected Range',
    fromLabel: formatDateShort(startDateKey),
    toLabel: formatDateShort(endDateKey),
    dayCountLabel,
    isSingleDay: false,
    showRange: true,
  };
};

export const formatDateRangeSubtitle = (startDateKey, endDateKey) => {
  const display = getDateRangeDisplay(startDateKey, endDateKey, false);

  if (display.isSingleDay) {
    return `${display.title} · Office attendance`;
  }

  return `${display.fromLabel} – ${display.toLabel} · Office attendance`;
};

export const buildDaysInRange = (startDateKey, endDateKey) => {
  const start = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${endDateKey}T00:00:00`);
  const days = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const dateKey = getLocalDateKey(cursor);
    const dateLabel = cursor.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    days.push({
      day: SHORT_DAY_LABELS[cursor.getDay()],
      dateKey,
      dateLabel,
      displayLabel: `${FULL_DAY_LABELS[cursor.getDay()]}, ${dateLabel}`,
      chartLabel: SHORT_DAY_LABELS[cursor.getDay()],
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  if (days.length > 7) {
    return days.map(entry => ({
      ...entry,
      chartLabel: entry.dateLabel,
    }));
  }

  return days;
};

export const buildCurrentWeekDays = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMonday);

  return WEEKDAY_LABELS.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      day,
      dateKey: getLocalDateKey(date),
    };
  });
};

export const formatWorkHours = hours => {
  const totalMinutes = Math.round((Number(hours) || 0) * 60);

  if (totalMinutes <= 0) {
    return '0h';
  }

  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (wholeHours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
};

export const formatDecimalHours = hours => formatWorkHours(hours);

const formatClockTime = iso => {
  if (!iso) {
    return '--';
  }

  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const secondsToHours = totalSeconds =>
  Math.round((totalSeconds / 3600) * 10000) / 10000;

const buildWeeklySummary = dayRows => {
  const totalHours = dayRows.reduce((sum, row) => sum + row.hours, 0);
  const workedDays = dayRows.filter(row => row.hours > 0).length;
  const avgHours = dayRows.length ? totalHours / dayRows.length : 0;
  const attendancePercent = Math.round((workedDays / dayRows.length) * 100);

  return {
    days: dayRows,
    totalHours,
    avgHours,
    attendancePercent,
    totalHoursLabel: formatDecimalHours(totalHours),
    avgHoursLabel: formatDecimalHours(avgHours),
    attendanceLabel: `${attendancePercent}%`,
  };
};

export const getEmptyWeeklyHours = () => {
  const { startDateKey, endDateKey } = getCurrentWeekRange();

  return buildWeeklySummary(
    buildDaysInRange(startDateKey, endDateKey).map(day => ({
      ...day,
      hours: 0,
      hoursLabel: '0h',
      clockIn: '--',
      clockOut: '--',
      barPercent: 0,
    })),
  );
};

const groupSessionsByDate = sessions => {
  const grouped = {};

  sessions.forEach(session => {
    const dateKey = getLocalDateKey(new Date(session.clock_in));
    const existing = grouped[dateKey] || {
      hours: 0,
      clockIn: session.clock_in,
      clockOut: session.clock_out,
    };

    existing.hours += Number(session.hours) || 0;

    if (session.clock_in && (!existing.clockIn || session.clock_in < existing.clockIn)) {
      existing.clockIn = session.clock_in;
    }

    if (session.clock_out && (!existing.clockOut || session.clock_out > existing.clockOut)) {
      existing.clockOut = session.clock_out;
    }

    grouped[dateKey] = existing;
  });

  return grouped;
};

export const saveDailyClockSession = async ({
  employeeId,
  employeeName,
  hoursToSave,
  segmentClockIn,
  clockOutAt = new Date(),
  notes = 'Office attendance',
  mergeMode = 'set',
}) => {
  if (!isSupabaseConfigured || !employeeId || hoursToSave <= 0) {
    return null;
  }

  const hours = secondsToHours(hoursToSave);
  const dateKey = getLocalDateKey();
  const { start, end } = getDayBounds(dateKey);
  const clockOutIso =
    clockOutAt instanceof Date ? clockOutAt.toISOString() : clockOutAt;
  const segmentClockInIso = segmentClockIn
    ? new Date(segmentClockIn).toISOString()
    : clockOutIso;

  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from(CLOCK_SESSIONS_TABLE)
    .select('id, hours, clock_in')
    .eq('employee_id', employeeId)
    .gte('clock_in', start)
    .lte('clock_in', end)
    .order('clock_in', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message || 'Failed to load today clock session');
  }

  if (existing?.id) {
    const updatedHours =
      mergeMode === 'add'
        ? secondsToHours(Number(existing.hours || 0) * 3600 + hoursToSave)
        : hours;

    const { error } = await supabase
      .from(CLOCK_SESSIONS_TABLE)
      .update({
        hours: updatedHours,
        clock_out: clockOutIso,
        status: 'completed',
        notes,
        employee_name: employeeName,
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(error.message || 'Failed to update clock session');
    }

    return existing.id;
  }

  const { data, error } = await supabase
    .from(CLOCK_SESSIONS_TABLE)
    .insert({
      employee_id: employeeId,
      employee_name: employeeName,
      clock_in: segmentClockInIso,
      clock_out: clockOutIso,
      status: 'completed',
      hours,
      notes,
      project_id: null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to save clock session');
  }

  return data.id;
};

export const fetchHoursForEmployeeInRange = async (
  employeeId,
  startDateKey,
  endDateKey,
) => {
  if (!isSupabaseConfigured || !employeeId) {
    return buildWeeklySummary(
      buildDaysInRange(startDateKey, endDateKey).map(day => ({
        ...day,
        hours: 0,
        hoursLabel: '0h',
        clockIn: '--',
        clockOut: '--',
        barPercent: 0,
      })),
    );
  }

  const rangeDays = buildDaysInRange(startDateKey, endDateKey);
  const rangeStart = new Date(`${startDateKey}T00:00:00`).toISOString();
  const rangeEnd = new Date(`${endDateKey}T23:59:59.999`).toISOString();

  const { data, error } = await getSupabase()
    .from(CLOCK_SESSIONS_TABLE)
    .select('hours, clock_in, clock_out')
    .eq('employee_id', employeeId)
    .gte('clock_in', rangeStart)
    .lte('clock_in', rangeEnd)
    .order('clock_in', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load hours for selected dates');
  }

  const grouped = groupSessionsByDate(data || []);

  const dayRows = rangeDays.map(day => {
    const session = grouped[day.dateKey];
    const hours = session?.hours || 0;

    return {
      ...day,
      hours,
      hoursLabel: formatWorkHours(hours),
      clockIn: formatClockTime(session?.clockIn),
      clockOut: formatClockTime(session?.clockOut),
      barPercent: Math.min(100, (hours / MAX_DAILY_HOURS_FOR_BAR) * 100),
    };
  });

  return buildWeeklySummary(dayRows);
};

export const fetchWeeklyHoursForEmployee = async employeeId => {
  const { startDateKey, endDateKey } = getCurrentWeekRange();
  return fetchHoursForEmployeeInRange(employeeId, startDateKey, endDateKey);
};
