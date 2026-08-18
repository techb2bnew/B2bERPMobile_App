import { Alert, Clipboard, Linking } from 'react-native';
import {
  MEETING_LINK_COPIED_MESSAGE,
  MEETING_LINK_COPIED_TITLE,
  MEETING_STATUS_COMPLETED,
  MEETING_STATUS_ONGOING,
  MEETING_STATUS_SCHEDULED,
} from '../constants/Constants';
import { getLocalDateKey } from '../services/clockSessionsService';

const TIME_STRING_REGEX = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

export const getTodayMeetingDateKey = () => getLocalDateKey();

export const buildMeetingDateKey = (offsetDays = 0, from = new Date()) => {
  const date = new Date(from);
  date.setDate(date.getDate() + offsetDays);
  return getLocalDateKey(date);
};

export const parseTimeStringToMinutes = timeStr => {
  const match = String(timeStr || '').match(TIME_STRING_REGEX);
  if (!match) {
    return 0;
  }

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return hour * 60 + minute;
};

export const formatDateToTimeString = date => {
  let hour = date.getHours();
  const minute = date.getMinutes();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
};

export const combineDateAndTime = (dateKey, timeStr) => {
  const base = new Date(`${dateKey}T00:00:00`);
  const minutesFromMidnight = parseTimeStringToMinutes(timeStr);
  base.setMinutes(base.getMinutes() + minutesFromMidnight);
  return base;
};

export const getMeetingStartDate = meeting => combineDateAndTime(meeting?.date, meeting?.startTime);

export const getMeetingEndDate = meeting => {
  const start = getMeetingStartDate(meeting);
  const durationMinutes = Number(meeting?.durationMinutes) || 0;
  return new Date(start.getTime() + durationMinutes * 60000);
};

export const getMeetingEndTimeLabel = meeting => formatDateToTimeString(getMeetingEndDate(meeting));

export const computeMeetingStatus = (meeting, now = new Date()) => {
  if (!meeting) {
    return MEETING_STATUS_SCHEDULED;
  }

  // An explicit status (set via Cancel, or by dragging a card on the Kanban
  // board) always wins over the time-derived status below.
  if (meeting.status) {
    return meeting.status;
  }

  const start = getMeetingStartDate(meeting);
  const end = getMeetingEndDate(meeting);
  const nowMs = now.getTime();

  if (nowMs < start.getTime()) {
    return MEETING_STATUS_SCHEDULED;
  }

  if (nowMs >= start.getTime() && nowMs <= end.getTime()) {
    return MEETING_STATUS_ONGOING;
  }

  return MEETING_STATUS_COMPLETED;
};

export const formatMeetingDateLabel = dateKey => {
  if (!dateKey) {
    return '';
  }

  const todayKey = getTodayMeetingDateKey();
  const tomorrowKey = buildMeetingDateKey(1);
  const yesterdayKey = buildMeetingDateKey(-1);

  if (dateKey === todayKey) {
    return 'Today';
  }
  if (dateKey === tomorrowKey) {
    return 'Tomorrow';
  }
  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }

  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatMeetingTimeRange = meeting =>
  `${meeting?.startTime || ''} - ${getMeetingEndTimeLabel(meeting)}`;

export const formatDurationLabel = minutes => {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours && mins) {
    return `${hours}h ${mins}m`;
  }
  if (hours) {
    return `${hours}h`;
  }
  return `${mins}m`;
};

export const getMinutesUntilStart = (meeting, now = new Date()) => {
  const start = getMeetingStartDate(meeting);
  return Math.round((start.getTime() - now.getTime()) / 60000);
};

export const isMeetingOnDate = (meeting, dateKey) => meeting?.date === dateKey;

export const isMeetingToday = meeting => isMeetingOnDate(meeting, getTodayMeetingDateKey());

export const sortMeetingsByStartTime = (meetings = []) =>
  [...meetings].sort((a, b) => getMeetingStartDate(a).getTime() - getMeetingStartDate(b).getTime());

export const openMeetingLink = async rawUrl => {
  if (!rawUrl) {
    return;
  }

  // Prefix a scheme if the organizer typed a bare domain (e.g. "meet.google.com/abc"),
  // otherwise Linking.openURL rejects it as an invalid URI.
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    // Note: Linking.canOpenURL() is unreliable for http/https on Android 11+
    // (package-visibility restrictions make it return false for links that
    // actually open fine), so we skip that pre-check and just try to open.
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert('Unable to Open Link', error?.message || 'This meeting link could not be opened.');
  }
};

export const copyMeetingLink = url => {
  if (!url) {
    return;
  }

  Clipboard.setString(url);
  Alert.alert(MEETING_LINK_COPIED_TITLE, MEETING_LINK_COPIED_MESSAGE);
};

export const shiftDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
};

export const getWeekDateKeys = (anchorDateKey = getTodayMeetingDateKey()) => {
  const anchor = new Date(`${anchorDateKey}T00:00:00`);
  const dayOfWeek = anchor.getDay();
  const sunday = shiftDateKey(anchorDateKey, -dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => shiftDateKey(sunday, i));
};

export const formatWeekdayShort = dateKey => {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const formatDayNumber = dateKey => {
  const date = new Date(`${dateKey}T00:00:00`);
  return String(date.getDate());
};

export const buildDayHourSlots = (startHour = 7, endHour = 21) => {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    const isPM = hour >= 12;
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    slots.push(`${String(hour12).padStart(2, '0')}:00 ${isPM ? 'PM' : 'AM'}`);
  }
  return slots;
};

export const getHourSlotForMeeting = (meeting, hourSlots) => {
  const minutes = parseTimeStringToMinutes(meeting.startTime);
  const hourStart = Math.floor(minutes / 60) * 60;
  const found = hourSlots.find(slot => parseTimeStringToMinutes(slot) === hourStart);
  if (found) {
    return found;
  }
  const firstMinutes = parseTimeStringToMinutes(hourSlots[0]);
  return minutes < firstMinutes ? hourSlots[0] : hourSlots[hourSlots.length - 1];
};

export const isJoinableNow = (meeting, now = new Date()) => {
  if (!meeting?.meetingLink) {
    return false;
  }
  const status = computeMeetingStatus(meeting, now);
  if (status === MEETING_STATUS_ONGOING) {
    return true;
  }
  if (status === MEETING_STATUS_SCHEDULED) {
    const minutesUntil = getMinutesUntilStart(meeting, now);
    return minutesUntil <= 15 && minutesUntil >= 0;
  }
  return false;
};
