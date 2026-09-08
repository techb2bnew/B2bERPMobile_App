import {
  createRealtimeChannelName,
  getSupabase,
  isSupabaseConfigured,
  syncSupabaseRealtimeAuth,
} from '../lib/supabase';

const CLOCK_SESSIONS_TABLE = 'clock_sessions';
const CLOCK_SESSION_SEGMENTS_TABLE = 'clock_session_segments';
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

  const labels = [...WEEKDAY_LABELS];

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  
  const nextWeekSaturday = new Date(saturday);
  nextWeekSaturday.setDate(saturday.getDate() + 7);
  
  if (saturday.getMonth() !== nextWeekSaturday.getMonth()) {
    labels.push('Sat');
  }

  return labels.map((day, index) => {
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
      sessionIds: [],
      hasOpenSession: false,
    };

    existing.hours += Number(session.hours) || 0;
    if (session.id) {
      existing.sessionIds.push(session.id);
    }

    if (session.clock_in && (!existing.clockIn || session.clock_in < existing.clockIn)) {
      existing.clockIn = session.clock_in;
    }

    if (!session.clock_out) {
      existing.hasOpenSession = true;
      existing.clockOut = null;
    } else if (!existing.hasOpenSession) {
      if (!existing.clockOut || session.clock_out > existing.clockOut) {
        existing.clockOut = session.clock_out;
      }
    }

    grouped[dateKey] = existing;
  });

  return grouped;
};

const isOfficeHoursSegment = seg => {
  if (!seg) return false;
  if (seg.kind === 'working' || seg.kind === 'meeting') return true;
  // Breaks labeled as meeting also count as meeting time
  if (
    seg.kind === 'break' &&
    String(seg.label || '')
      .toLowerCase()
      .includes('meeting')
  ) {
    return true;
  }
  return false;
};

const sumWorkingHoursFromSegments = (segments, nowMs = Date.now()) => {
  let totalMs = 0;

  (segments || []).forEach(seg => {
    if (!isOfficeHoursSegment(seg) || !seg.started_at) {
      return;
    }
    const start = new Date(seg.started_at).getTime();
    const end = seg.ended_at ? new Date(seg.ended_at).getTime() : nowMs;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      totalMs += end - start;
    }
  });

  return secondsToHours(totalMs / 1000);
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

/* ------------------------------------------------------------------ *
 * Clock In / Break / Resume / End Day — exact parity with the admin web
 * app's (ERP-BASE2BRAND) `clockInEmployee` / `clockOutEmployee`.
 *
 * These write `clock_session_segments` alongside `clock_sessions`, because
 * the admin Shift Tracker timeline and its "On Break" badge are built purely
 * from segments. The older `saveDailyClockSession` wrote only clock_sessions,
 * which is why a mobile clock-in showed up in admin with no timeline.
 * ------------------------------------------------------------------ */

/** Break reason -> segment kind + label (mirrors the admin CLOCK_OUT_OPTIONS). */
export const CLOCK_BREAK_REASONS = [
  { id: 'lunch', label: 'Lunch Break', desc: 'Going for lunch', kind: 'break' },
  { id: 'tea', label: 'Tea / Short Break', desc: 'Quick break', kind: 'break' },
  {
    id: 'personal',
    label: 'Personal / Urgent work',
    desc: 'Stepped out for something',
    kind: 'break',
  },
  {
    id: 'meeting',
    label: 'Meeting / Outside',
    desc: 'Client or outside meeting',
    kind: 'meeting',
  },
  { id: 'end_day', label: 'End Day', desc: 'Leaving office for today', kind: null },
];

const WORKING_SEGMENT_LABEL = 'Office attendance';
const MAX_SESSION_HOURS = 12;

const findBreakReason = reasonId =>
  CLOCK_BREAK_REASONS.find(option => option.id === reasonId) || null;

const segmentKindFromReason = reasonId => {
  if (reasonId === 'idle') {
    return 'idle';
  }
  return reasonId === 'meeting' ? 'meeting' : 'break';
};

const segmentLabelFromReason = reasonId => {
  if (reasonId === 'end_day') {
    return 'End of day';
  }
  if (reasonId === 'idle') {
    return 'System Idle';
  }
  return findBreakReason(reasonId)?.label || String(reasonId);
};

const sessionNoteFromReason = reasonId => {
  if (reasonId === 'end_day') {
    return 'End of day';
  }
  const option = findBreakReason(reasonId);
  return option ? `Break: ${option.label}` : `Break: ${reasonId}`;
};

/** Mirrors the admin calculateSessionHours — capped at 12 hours, rounded to 4 decimals. */
const segmentHoursBetween = (startIso, endMs) => {
  if (!startIso) {
    return 0;
  }
  const elapsedMs = endMs - new Date(startIso).getTime();
  if (elapsedMs < 1000) {
    return 0;
  }
  const cappedMs = Math.min(elapsedMs, MAX_SESSION_HOURS * 3600000);
  return Math.round((cappedMs / 3600000) * 10000) / 10000;
};

const roundHours = value => Math.round(Number(value || 0) * 10000) / 10000;

/** Today's session whatever its status — mirrors the admin fetchTodayOfficeSession. */
const fetchTodaySessionRow = async (supabase, employeeId) => {
  const { start, end } = getDayBounds(getLocalDateKey());

  const { data, error } = await supabase
    .from(CLOCK_SESSIONS_TABLE)
    .select('*')
    .eq('employee_id', employeeId)
    .gte('clock_in', start)
    .lte('clock_in', end)
    .order('clock_in', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load today clock session');
  }

  return data || null;
};

/** Closes any still-open segments (ended_at null). */
const closeOpenSegments = async (supabase, sessionId, endedAtMs) => {
  const { data: openSegments, error } = await supabase
    .from(CLOCK_SESSION_SEGMENTS_TABLE)
    .select('id, started_at')
    .eq('session_id', sessionId)
    .is('ended_at', null);

  if (error || !openSegments?.length) {
    return;
  }

  await Promise.all(
    openSegments.map(segment => {
      const startMs = new Date(segment.started_at).getTime();
      const safeEndMs = Math.max(startMs, endedAtMs);
      return supabase
        .from(CLOCK_SESSION_SEGMENTS_TABLE)
        .update({ ended_at: new Date(safeEndMs).toISOString() })
        .eq('id', segment.id);
    }),
  );
};

const insertSegment = async (supabase, { sessionId, kind, label, startedAtMs }) => {
  if (!sessionId || !kind) {
    return;
  }
  await supabase.from(CLOCK_SESSION_SEGMENTS_TABLE).insert({
    session_id: sessionId,
    kind,
    label,
    started_at: new Date(startedAtMs).toISOString(),
    ended_at: null,
  });
};

/**
 * Clock In / Resume. Reactivates today's session if one exists, otherwise
 * creates a new one. Either way a fresh `working` segment is opened.
 */
export const startClockSession = async ({ employeeId, employeeName }) => {
  if (!isSupabaseConfigured || !employeeId) {
    return null;
  }

  const supabase = getSupabase();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayRow = await fetchTodaySessionRow(supabase, employeeId);

  if (todayRow?.id) {
    if (todayRow.status === 'active') {
      return todayRow.id;
    }

    await closeOpenSegments(supabase, todayRow.id, nowMs);

    const { error } = await supabase
      .from(CLOCK_SESSIONS_TABLE)
      .update({
        status: 'active',
        session_start: nowIso,
        clock_out: null,
        notes: WORKING_SEGMENT_LABEL,
        employee_name: employeeName,
      })
      .eq('id', todayRow.id);

    if (error) {
      throw new Error(error.message || 'Failed to resume clock session');
    }

    await insertSegment(supabase, {
      sessionId: todayRow.id,
      kind: 'working',
      label: WORKING_SEGMENT_LABEL,
      startedAtMs: nowMs,
    });

    return todayRow.id;
  }

  const { data, error } = await supabase
    .from(CLOCK_SESSIONS_TABLE)
    .insert({
      employee_id: employeeId,
      employee_name: employeeName,
      clock_in: nowIso,
      session_start: nowIso,
      clock_out: null,
      status: 'active',
      hours: 0,
      notes: WORKING_SEGMENT_LABEL,
      project_id: null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to start clock session');
  }

  await insertSegment(supabase, {
    sessionId: data.id,
    kind: 'working',
    label: WORKING_SEGMENT_LABEL,
    startedAtMs: nowMs,
  });

  return data.id;
};

/**
 * A break (lunch / tea / personal / meeting) or End Day.
 * A break sets the session to `paused` and opens a break segment.
 * End Day sets the session to `completed` and opens no new segment.
 */
export const stopClockSession = async ({
  employeeId,
  employeeName,
  reasonId = 'end_day',
  stoppedAt = new Date(),
}) => {
  if (!isSupabaseConfigured || !employeeId) {
    return null;
  }

  const supabase = getSupabase();
  const stopMs =
    stoppedAt instanceof Date ? stoppedAt.getTime() : new Date(stoppedAt).getTime();
  const stopIso = new Date(stopMs).toISOString();
  const endDay = reasonId === 'end_day';

  const todayRow = await fetchTodaySessionRow(supabase, employeeId);
  if (!todayRow?.id) {
    return null;
  }

  if (todayRow.status === 'completed') {
    return todayRow.id;
  }

  // Only time from an actively running session is added to the total hours.
  const workedHours =
    todayRow.status === 'active'
      ? segmentHoursBetween(todayRow.session_start || todayRow.clock_in, stopMs)
      : 0;
  const totalHours = roundHours(Number(todayRow.hours || 0) + workedHours);

  await closeOpenSegments(supabase, todayRow.id, stopMs);

  if (!endDay) {
    await insertSegment(supabase, {
      sessionId: todayRow.id,
      kind: segmentKindFromReason(reasonId),
      label: segmentLabelFromReason(reasonId),
      startedAtMs: stopMs,
    });
  }

  const { error } = await supabase
    .from(CLOCK_SESSIONS_TABLE)
    .update({
      clock_out: endDay ? stopIso : null,
      status: endDay ? 'completed' : 'paused',
      hours: totalHours,
      session_start: endDay ? null : stopIso,
      notes: sessionNoteFromReason(reasonId),
      employee_name: employeeName,
    })
    .eq('id', todayRow.id);

  if (error) {
    throw new Error(error.message || 'Failed to stop clock session');
  }

  return todayRow.id;
};

/** Today's live status — used to restore the timer when the app reopens. */
export const fetchTodayClockSessionState = async employeeId => {
  if (!isSupabaseConfigured || !employeeId) {
    return null;
  }

  const supabase = getSupabase();
  const row = await fetchTodaySessionRow(supabase, employeeId);
  if (!row) {
    return null;
  }

  return {
    sessionId: row.id,
    status: row.status,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    sessionStart: row.session_start,
    accumulatedSeconds: Math.max(0, Math.round(Number(row.hours || 0) * 3600)),
    notes: row.notes,
  };
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
  const nowMs = Date.now();

  const { data, error } = await getSupabase()
    .from(CLOCK_SESSIONS_TABLE)
    .select('id, hours, clock_in, clock_out, status')
    .eq('employee_id', employeeId)
    .gte('clock_in', rangeStart)
    .lte('clock_in', rangeEnd)
    .order('clock_in', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load hours for selected dates');
  }

  const sessions = data || [];
  const sessionIds = sessions.map(s => s.id).filter(Boolean);
  let segmentsBySessionId = {};

  if (sessionIds.length > 0) {
    const { data: rawSegments, error: segError } = await getSupabase()
      .from(CLOCK_SESSION_SEGMENTS_TABLE)
      .select('id, session_id, kind, label, started_at, ended_at')
      .in('session_id', sessionIds)
      .order('started_at', { ascending: true });

    if (!segError && rawSegments) {
      segmentsBySessionId = rawSegments.reduce((map, seg) => {
        if (!map[seg.session_id]) {
          map[seg.session_id] = [];
        }
        map[seg.session_id].push(seg);
        return map;
      }, {});
    }
  }

  const grouped = groupSessionsByDate(sessions);

  // Prefer live working-segment hours (matches web meeting/lunch behavior)
  Object.keys(grouped).forEach(dateKey => {
    const daySessionIds = grouped[dateKey].sessionIds || [];
    const daySegments = daySessionIds.flatMap(
      id => segmentsBySessionId[id] || [],
    );

    if (daySegments.length > 0) {
      grouped[dateKey].hours = sumWorkingHoursFromSegments(daySegments, nowMs);
      grouped[dateKey].fromSegments = true;
    }
  });

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
      fromSegments: Boolean(session?.fromSegments),
    };
  });

  return buildWeeklySummary(dayRows);
};

export const fetchWeeklyHoursForEmployee = async employeeId => {
  const { startDateKey, endDateKey } = getCurrentWeekRange();
  return fetchHoursForEmployeeInRange(employeeId, startDateKey, endDateKey);
};

const CLOCK_REALTIME_EVENTS = ['INSERT', 'UPDATE', 'DELETE'];

export const subscribeToEmployeeClockSessions = (employeeId, onChange) => {
  if (!isSupabaseConfigured || !employeeId) {
    return () => {};
  }

  let active = true;
  let channel = null;
  let reconnectTimer = null;
  const onChangeRef = { current: onChange };
  onChangeRef.current = onChange;

  const teardownChannel = () => {
    if (channel) {
      getSupabase().removeChannel(channel);
      channel = null;
    }
  };

  const notifyIfOwnedSegment = async payload => {
    const sessionId =
      payload?.new?.session_id || payload?.old?.session_id || null;
    if (!sessionId) {
      return;
    }

    try {
      const { data } = await getSupabase()
        .from(CLOCK_SESSIONS_TABLE)
        .select('employee_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (data?.employee_id === employeeId) {
        onChangeRef.current(payload);
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[realtime] segment ownership check failed', e?.message);
      }
    }
  };

  const connect = async () => {
    if (!active) {
      return;
    }

    await syncSupabaseRealtimeAuth();

    if (!active) {
      return;
    }

    teardownChannel();

    const supabase = getSupabase();
    const channelName = createRealtimeChannelName(`clock-attendance-${employeeId}`);
    const nextChannel = supabase.channel(channelName);

    CLOCK_REALTIME_EVENTS.forEach(event => {
      nextChannel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: CLOCK_SESSIONS_TABLE,
          filter: `employee_id=eq.${employeeId}`,
        },
        payload => {
          if (__DEV__) {
            console.log('[realtime] clock_sessions event', payload.eventType);
          }
          onChangeRef.current(payload);
        },
      );

      nextChannel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: CLOCK_SESSION_SEGMENTS_TABLE,
        },
        payload => {
          if (__DEV__) {
            console.log(
              '[realtime] clock_session_segments event',
              payload.eventType,
            );
          }
          notifyIfOwnedSegment(payload);
        },
      );
    });

    channel = nextChannel;

    channel.subscribe((status, err) => {
      if (__DEV__) {
        console.log(
          '[realtime] clock attendance channel',
          channelName,
          status,
          err?.message || '',
        );
      }

      if (!active) {
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        reconnectTimer = setTimeout(() => {
          connect();
        }, 2000);
      }
    });
  };

  connect();

  return () => {
    active = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    teardownChannel();
  };
};

export const fetchActiveEmployeeStatuses = async () => {
  if (!isSupabaseConfigured) return {};
  try {
    const supabase = getSupabase();
    // Fetch all active sessions
    const { data: activeSessions, error: sessionErr } = await supabase
      .from(CLOCK_SESSIONS_TABLE)
      .select('id, employee_id, clock_in')
      .is('clock_out', null);

    if (sessionErr) throw sessionErr;

    if (!activeSessions || activeSessions.length === 0) return {};

    const sessionIds = activeSessions.map(s => s.id);

    // Fetch active segments for those sessions
    const { data: activeSegments, error: segmentErr } = await supabase
      .from('clock_session_segments')
      .select('session_id, kind, label')
      .in('session_id', sessionIds)
      .is('ended_at', null);

    if (segmentErr) throw segmentErr;

    const statusMap = {};
    activeSessions.forEach(session => {
      const segment = activeSegments?.find(seg => seg.session_id === session.id);
      let status = 'Live'; // default if clocked in
      let label = '';
      if (segment && segment.kind === 'break') {
        status = (segment.label || '').toLowerCase().includes('lunch') ? 'On Lunch' : 'On Break';
        label = segment.label;
      }
      statusMap[session.employee_id] = { status, label };
    });

    return statusMap;
  } catch (err) {
    console.error('Error fetching active employee statuses:', err);
    return {};
  }
};
