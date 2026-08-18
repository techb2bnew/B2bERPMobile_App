import { createRealtimeChannelName, getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { MEETING_STATUS_CANCELLED } from '../constants/Constants';
import { fetchAllEmployeeProfiles } from './employeeService';
import { fetchUnreadNotificationCount } from './notificationService';
import { sendPushToUser } from './pushNotificationService';
import { formatMeetingDateLabel } from '../utils/meetingUtils';

const MEETINGS_TABLE = 'meetings';
const NOTIFICATIONS_TABLE = 'notifications';

export const MEETING_TYPE_OPTIONS = [
  'Client Meeting',
  'Team Meeting',
  'Internal Meeting',
  'Project Discussion',
  'Demo',
  'Review',
];

export const MEETING_PLATFORM_OPTIONS = [
  'Zoom',
  'Google Meet',
  'Microsoft Teams',
  'In-person',
  'Other',
];

export const MEETING_DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 90, 120];

// Only used if the employee directory itself fails to load — not meeting data.
const FALLBACK_PARTICIPANTS = [
  { id: 'mock-emp-1', name: 'Shubham Kumar' },
  { id: 'mock-emp-2', name: 'Ankit Verma' },
  { id: 'mock-emp-3', name: 'Priya Sharma' },
  { id: 'mock-emp-4', name: 'Rahul Gupta' },
  { id: 'mock-emp-5', name: 'Kavya Nair' },
];

export const mapMeetingRowToApp = row => ({
  id: row.id,
  title: row.title || '',
  type: row.type || MEETING_TYPE_OPTIONS[0],
  platform: row.platform || MEETING_PLATFORM_OPTIONS[0],
  meetingLink: row.meeting_link || '',
  date: row.date,
  startTime: row.start_time,
  durationMinutes: row.duration_minutes || MEETING_DURATION_OPTIONS_MINUTES[0],
  agenda: row.agenda || '',
  participantIds: Array.isArray(row.participant_ids) ? row.participant_ids : [],
  participantNames: Array.isArray(row.participant_names) ? row.participant_names : [],
  organizerId: row.organizer_id || '',
  organizerName: row.organizer_name || '',
  status: row.status || null,
  createdAt: row.created_at,
});

const mapMeetingPayloadToRow = payload => {
  const row = {};
  if (payload.title !== undefined) row.title = payload.title;
  if (payload.type !== undefined) row.type = payload.type;
  if (payload.platform !== undefined) row.platform = payload.platform;
  if (payload.meetingLink !== undefined) row.meeting_link = payload.meetingLink;
  if (payload.date !== undefined) row.date = payload.date;
  if (payload.startTime !== undefined) row.start_time = payload.startTime;
  if (payload.durationMinutes !== undefined) row.duration_minutes = payload.durationMinutes;
  if (payload.agenda !== undefined) row.agenda = payload.agenda;
  if (payload.participantIds !== undefined) row.participant_ids = payload.participantIds;
  if (payload.participantNames !== undefined) row.participant_names = payload.participantNames;
  if (payload.organizerId !== undefined) row.organizer_id = payload.organizerId;
  if (payload.organizerName !== undefined) row.organizer_name = payload.organizerName;
  if (payload.status !== undefined) row.status = payload.status;
  return row;
};

export const fetchMeetings = async () => {
  const { data, error } = await getSupabase()
    .from(MEETINGS_TABLE)
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load meetings');
  }

  return (data || []).map(mapMeetingRowToApp);
};

export const fetchMeetingById = async id => {
  const { data, error } = await getSupabase()
    .from(MEETINGS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load meeting');
  }

  return data ? mapMeetingRowToApp(data) : null;
};

// Shared by every meeting notification (creation, status change, ...): writes
// one in-app notification row per recipient, then best-effort sends an OS
// push on top — same mechanism chatService.js already uses for chat messages
// (Supabase Edge Function -> FCM). Never throws: a notification failure must
// never block the underlying meeting create/update from succeeding.
const notifyUsers = async ({ recipientIds, senderId, title, message, type, referenceId }) => {
  const uniqueRecipientIds = [...new Set((recipientIds || []).filter(Boolean))].filter(
    id => id !== senderId,
  );

  if (uniqueRecipientIds.length === 0) {
    return;
  }

  const rows = uniqueRecipientIds.map(recipientId => ({
    recipient_id: recipientId,
    sender_id: senderId || 'unknown',
    title,
    message,
    type,
    reference_id: referenceId,
    is_read: false,
  }));

  const { error } = await getSupabase().from(NOTIFICATIONS_TABLE).insert(rows);
  if (error && __DEV__) {
    console.warn(`Failed to insert ${type} notifications:`, error.message || error);
  }

  // Promise.allSettled never rejects itself, so each result is checked
  // individually below — otherwise a per-recipient push failure would be
  // silently swallowed with no way to see why.
  const pushResults = await Promise.allSettled(
    uniqueRecipientIds.map(async recipientId => {
      const badgeCount = await fetchUnreadNotificationCount(recipientId).catch(() => undefined);
      return sendPushToUser({
        recipientUserId: recipientId,
        title,
        body: message,
        badgeCount,
        data: { type, meetingId: String(referenceId) },
      });
    }),
  );

  pushResults.forEach((result, index) => {
    const recipientId = uniqueRecipientIds[index];
    if (result.status === 'rejected') {
      if (__DEV__) {
        console.warn(
          `[Meetings] Push failed for ${recipientId}:`,
          result.reason?.message || result.reason,
        );
      }
      return;
    }
    if (result.value?.success === false && __DEV__) {
      console.warn(`[Meetings] Push skipped for ${recipientId}: ${result.value.reason}`);
    }
  });
};

const notifyMeetingParticipants = meeting =>
  notifyUsers({
    recipientIds: meeting.participantIds,
    senderId: meeting.organizerId,
    title: 'New Meeting Scheduled',
    message: `${meeting.organizerName || 'Someone'} scheduled "${meeting.title}" on ${formatMeetingDateLabel(meeting.date)} at ${meeting.startTime}.`,
    type: 'meeting_scheduled',
    referenceId: meeting.id,
  });

const notifyMeetingStatusChange = (meeting, newStatus, actingUserId) =>
  notifyUsers({
    recipientIds: [...(meeting.participantIds || []), meeting.organizerId],
    senderId: actingUserId,
    title: 'Meeting Status Updated',
    message: `"${meeting.title}" is now marked as ${newStatus}.`,
    type: 'meeting_status_changed',
    referenceId: meeting.id,
  });

export const createMeeting = async payload => {
  const row = mapMeetingPayloadToRow(payload);
  const { data, error } = await getSupabase().from(MEETINGS_TABLE).insert(row).select().single();

  if (error) {
    throw new Error(error.message || 'Failed to create meeting');
  }

  const created = mapMeetingRowToApp(data);
  await notifyMeetingParticipants(created);
  return created;
};

export const updateMeeting = async (id, payload) => {
  const row = mapMeetingPayloadToRow(payload);
  const { data, error } = await getSupabase()
    .from(MEETINGS_TABLE)
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update meeting');
  }

  return mapMeetingRowToApp(data);
};

// Use this (instead of calling updateMeeting directly) whenever a meeting's
// status changes on purpose — Kanban drag-and-drop or the Cancel action —
// so participants and the organizer are notified. Plain field edits (agenda,
// link, reschedule date/time) go through updateMeeting directly and stay
// silent, matching the plan to only notify on an explicit status change.
export const changeMeetingStatus = async (meeting, newStatus, actingUserId) => {
  const updated = await updateMeeting(meeting.id, { status: newStatus });
  await notifyMeetingStatusChange(updated, newStatus, actingUserId);
  return updated;
};

export const cancelMeeting = (meeting, actingUserId) =>
  changeMeetingStatus(meeting, MEETING_STATUS_CANCELLED, actingUserId);

export const deleteMeeting = async id => {
  const { error } = await getSupabase().from(MEETINGS_TABLE).delete().eq('id', id);

  if (error) {
    throw new Error(error.message || 'Failed to delete meeting');
  }
};

export const subscribeToMeetingsChanges = onChange => {
  if (!isSupabaseConfigured || typeof onChange !== 'function') {
    return () => {};
  }

  const supabase = getSupabase();
  const channelName = createRealtimeChannelName('meetings');
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: MEETINGS_TABLE },
      payload => onChange(payload),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const fetchParticipantDirectory = async () => {
  try {
    const employees = await fetchAllEmployeeProfiles();
    const mapped = employees
      .filter(employee => employee?.id)
      .map(employee => ({ id: employee.id, name: employee.name || 'Employee' }));
    return mapped.length > 0 ? mapped : FALLBACK_PARTICIPANTS;
  } catch (error) {
    return FALLBACK_PARTICIPANTS;
  }
};
