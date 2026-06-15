import {
  createRealtimeChannelName,
  getSupabase,
  syncSupabaseRealtimeAuth,
} from '../lib/supabase';
import {
  formatTaskDate,
  formatTaskEstimateHours,
  getUserId,
  isCreatedToday,
} from '../utils/projectUtils';
import { mapAppStatusToDb, mapDbStatusToApp } from './projectsService';

const PROJECT_TASKS_TABLE = 'project_tasks';
const TASK_STATUS_HISTORY_TABLE = 'task_status_history';

const generateStatusHistoryId = () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `tsh-${Date.now()}-${suffix}`;
};

const fetchTaskCurrentState = async taskId => {
  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('status, project_id')
    .eq('id', taskId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const closeOpenTaskStatusHistory = async (taskId, exitedAt = new Date()) => {
  const { data: openRow, error: fetchError } = await getSupabase()
    .from(TASK_STATUS_HISTORY_TABLE)
    .select('id, entered_at')
    .eq('task_id', taskId)
    .is('exited_at', null)
    .order('entered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!openRow) {
    return;
  }

  const enteredAt = new Date(openRow.entered_at);
  const durationSeconds = Math.max(
    0,
    Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 1000),
  );

  const { error: updateError } = await getSupabase()
    .from(TASK_STATUS_HISTORY_TABLE)
    .update({
      exited_at: exitedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq('id', openRow.id);

  if (updateError) {
    throw updateError;
  }
};

const insertTaskStatusHistoryRow = async ({
  taskId,
  projectId,
  fromStatus,
  toStatus,
  movedBy,
  enteredAt,
}) => {
  const now = enteredAt || new Date().toISOString();
  const row = {
    id: generateStatusHistoryId(),
    task_id: taskId,
    project_id: projectId,
    from_status: fromStatus ?? null,
    to_status: toStatus,
    entered_at: now,
    exited_at: null,
    duration_seconds: null,
    moved_by: movedBy || null,
    created_at: new Date().toISOString(),
  };

  const { error } = await getSupabase().from(TASK_STATUS_HISTORY_TABLE).insert(row);

  if (error) {
    throw error;
  }
};

const recordTaskStatusHistoryCreate = async ({ taskId, projectId, toStatus, movedBy }) => {
  await insertTaskStatusHistoryRow({
    taskId,
    projectId,
    fromStatus: null,
    toStatus,
    movedBy,
  });
};

const recordTaskStatusHistoryChange = async ({
  taskId,
  projectId,
  fromStatus,
  toStatus,
  movedBy,
}) => {
  if (!toStatus || fromStatus === toStatus) {
    return;
  }

  const now = new Date();
  await closeOpenTaskStatusHistory(taskId, now);
  await insertTaskStatusHistoryRow({
    taskId,
    projectId,
    fromStatus,
    toStatus,
    movedBy,
    enteredAt: now.toISOString(),
  });
};

const safeRecordTaskStatusHistory = async (label, operation) => {
  try {
    await operation();
  } catch (error) {
    console.log(`[projectTasksService] ${label} failed`, {
      message: error?.message,
      code: error?.code,
      details: error?.details,
    });
  }
};

const isNetworkError = error => {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('network request failed') || message.includes('failed to fetch');
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const runWithNetworkRetry = async (operation, label) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`[projectTasksService] ${label} attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error) {
      const shouldRetry = isNetworkError(error) && attempt < maxAttempts;
      console.log(`[projectTasksService] ${label} attempt ${attempt} failed`, {
        message: error?.message,
        code: error?.code,
        willRetry: shouldRetry,
      });

      if (!shouldRetry) {
        throw error;
      }

      await wait(300 * attempt);
    }
  }

  return null;
};

// DB default is ''::text — null is not allowed on work_notes
const toWorkNotes = value => String(value || '').trim();

// due / est columns allow NULL in DB
const toNullableText = value => {
  const trimmed = String(value || '').trim();
  return trimmed || null;
};

export const mapProjectTaskRowToApp = (row, projectMeta = {}) => ({
  id: row.id,
  title: row.title || 'Untitled task',
  description: row.work_notes || '',
  status: mapDbStatusToApp(row.status),
  priority: (row.priority || 'medium').toLowerCase(),
  project: projectMeta.name || '',
  projectId: row.project_id || '',
  estimatedHours: String(row.est || '').replace(/h$/i, ''),
  estimateLabel: formatTaskEstimateHours(row.est),
  hoursWorked: row.est ? `${formatTaskEstimateHours(row.est)} est` : '',
  assignee: projectMeta.assigneeName || '',
  assigneeId: row.assignee_id || '',
  createdDate: formatTaskDate(row.created_at || row.created_date),
  dueDate: formatTaskDate(row.due),
});

export const mapAppTaskToProjectTaskRow = (task, { projectId, assigneeId }) => {
  const estimated = task.estimatedHours
    ? `${String(task.estimatedHours).replace(/h$/i, '')}h`
    : null;

  return {
    id: task.id || `task-${Date.now()}`,
    project_id: projectId,
    assignee_id: assigneeId,
    title: task.title?.trim() || 'Untitled task',
    work_notes: toWorkNotes(task.description),
    status: mapAppStatusToDb(task.status),
    priority: (task.priority || 'medium').toLowerCase(),
    due: toNullableText(task.dueDate),
    est: estimated,
  };
};

export const fetchProjectTasksForUser = async (projectId, assigneeId) => {
  if (!projectId || !assigneeId) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('*')
    .eq('project_id', projectId)
    .eq('assignee_id', assigneeId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

const buildTaskUpdateRow = task => {
  const estimated = task.estimatedHours
    ? `${String(task.estimatedHours).replace(/h$/i, '')}h`
    : null;

  return {
    title: task.title?.trim() || 'Untitled task',
    work_notes: toWorkNotes(task.description),
    status: mapAppStatusToDb(task.status),
    priority: (task.priority || 'medium').toLowerCase(),
    due: toNullableText(task.dueDate),
    est: estimated,
    updated_at: new Date().toISOString(),
  };
};

const runInsert = async row => {
  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .insert(row)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data || row;
};

const runUpdate = async (taskId, row) => {
  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .update(row)
    .eq('id', taskId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data || { id: taskId, ...row };
};

export const createProjectTask = async (task, { projectId, assigneeId, movedBy }) => {
  const row = mapAppTaskToProjectTaskRow(task, { projectId, assigneeId });

  console.log('[projectTasksService] INSERT project_tasks', {
    table: PROJECT_TASKS_TABLE,
    row: JSON.stringify(row),
    projectId,
    assigneeId,
  });

  const insertedRow = await runWithNetworkRetry(
    () => runInsert(row),
    'INSERT project_tasks',
  );

  await safeRecordTaskStatusHistory('INSERT task_status_history (create)', () =>
    recordTaskStatusHistoryCreate({
      taskId: insertedRow.id,
      projectId,
      toStatus: row.status,
      movedBy: movedBy || assigneeId,
    }),
  );

  console.log('[projectTasksService] INSERT success', insertedRow);
  return insertedRow;
};

export const updateProjectTask = async (taskId, task, { movedBy, projectId } = {}) => {
  const current = await fetchTaskCurrentState(taskId);
  const row = buildTaskUpdateRow(task);

  console.log('[projectTasksService] UPDATE project_tasks', {
    table: PROJECT_TASKS_TABLE,
    taskId,
    row: JSON.stringify(row),
  });

  const updatedRow = await runWithNetworkRetry(
    () => runUpdate(taskId, row),
    'UPDATE project_tasks',
  );

  await safeRecordTaskStatusHistory('INSERT task_status_history (update)', () =>
    recordTaskStatusHistoryChange({
      taskId,
      projectId: projectId || current?.project_id,
      fromStatus: current?.status,
      toStatus: row.status,
      movedBy,
    }),
  );

  console.log('[projectTasksService] UPDATE success', updatedRow);
  return updatedRow;
};

export const updateProjectTaskStatus = async (taskId, appStatus, { movedBy, projectId } = {}) => {
  const current = await fetchTaskCurrentState(taskId);
  const newDbStatus = mapAppStatusToDb(appStatus);
  const row = {
    status: newDbStatus,
    updated_at: new Date().toISOString(),
  };

  const updatedRow = await runWithNetworkRetry(
    () => runUpdate(taskId, row),
    'UPDATE project_tasks status',
  );

  await safeRecordTaskStatusHistory('INSERT task_status_history (status)', () =>
    recordTaskStatusHistoryChange({
      taskId,
      projectId: projectId || current?.project_id,
      fromStatus: current?.status,
      toStatus: newDbStatus,
      movedBy,
    }),
  );

  return updatedRow;
};

export const fetchTodayTasksForUser = async (user, projectNameById = {}) => {
  const assigneeId = getUserId(user);
  if (!assigneeId) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('*')
    .eq('assignee_id', assigneeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter(row => isCreatedToday(row.created_at || row.created_date))
    .map(row =>
      mapProjectTaskRowToApp(row, {
        name: projectNameById[row.project_id] || '',
        assigneeName: user?.name || '',
      }),
    );
};

export const fetchOpenTaskCountsByProject = async assigneeId => {
  if (!assigneeId) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('project_id, status')
    .eq('assignee_id', assigneeId)
    .neq('status', 'done');

  if (error) {
    throw error;
  }

  return (data || []).reduce((counts, row) => {
    counts[row.project_id] = (counts[row.project_id] || 0) + 1;
    return counts;
  }, {});
};

const REALTIME_EVENTS = ['INSERT', 'UPDATE', 'DELETE'];

const subscribeToProjectTasksTable = ({
  channelPrefix,
  filter,
  matchesRow,
  onChange,
}) => {
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

  const handlePayload = payload => {
    const row = payload.new || payload.old;
    if (matchesRow && row && !matchesRow(row, payload)) {
      return;
    }

    if (__DEV__) {
      console.log('[realtime] project_tasks event', {
        eventType: payload.eventType,
        id: row?.id,
        project_id: row?.project_id,
        assignee_id: row?.assignee_id,
      });
    }

    onChangeRef.current(payload);
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
    const channelName = createRealtimeChannelName(channelPrefix);
    const nextChannel = supabase.channel(channelName);

    REALTIME_EVENTS.forEach(event => {
      nextChannel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: PROJECT_TASKS_TABLE,
          ...(filter ? { filter } : {}),
        },
        handlePayload,
      );
    });

    channel = nextChannel;

    channel.subscribe((status, err) => {
      if (__DEV__) {
        console.log('[realtime] project_tasks channel', channelName, status, err?.message || '');
      }

      if (!active) {
        return;
      }

      if (status === 'SUBSCRIBED') {
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

export const subscribeToProjectTasksChanges = (projectId, onChange) => {
  if (!projectId) {
    return () => {};
  }

  return subscribeToProjectTasksTable({
    channelPrefix: `project-tasks-${projectId}`,
    filter: `project_id=eq.${projectId}`,
    onChange,
  });
};

export const subscribeToAssigneeProjectTasksChanges = (assigneeId, onChange) => {
  if (!assigneeId) {
    return () => {};
  }

  return subscribeToProjectTasksTable({
    channelPrefix: `assignee-tasks-${assigneeId}`,
    filter: `assignee_id=eq.${assigneeId}`,
    onChange,
  });
};

export const subscribeToUserProjectTasksChanges = (projectId, assigneeId, onChange) => {
  if (!projectId || !assigneeId) {
    return () => {};
  }

  return subscribeToProjectTasksTable({
    channelPrefix: `user-project-tasks-${projectId}-${assigneeId}`,
    matchesRow: row => row.project_id === projectId && row.assignee_id === assigneeId,
    onChange,
  });
};
