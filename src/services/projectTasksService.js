import {
  createRealtimeChannelName,
  getSupabase,
  syncSupabaseRealtimeAuth,
} from '../lib/supabase';
import {
  TASK_FILTER_DONE,
  TASK_STATUS_READY_FOR_TESTING,
} from '../constants/Constants';
import {
  formatTaskDate,
  formatTaskEstimateHours,
  getUserId,
  isTaskScheduledToday,
  normalizeAssigneeIds,
  normalizeTaskDateKey,
  rowAssignedToUserId,
} from '../utils/projectUtils';
import { mapAppStatusToDb, mapDbStatusToApp } from './projectsService';

const PROJECT_TASKS_TABLE = 'project_tasks';
const TASK_STATUS_HISTORY_TABLE = 'task_status_history';

const fetchOpenTaskRowsForAssigneeCounts = async () => {
  const withAssigneeIds = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('project_id, status, assignee_id, assignee_ids')
    .neq('status', 'done');

  if (!withAssigneeIds.error) {
    return withAssigneeIds.data || [];
  }

  const message = withAssigneeIds.error.message || '';
  if (!message.includes('assignee_ids')) {
    throw withAssigneeIds.error;
  }

  const fallback = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('project_id, status, assignee_id')
    .neq('status', 'done');

  if (fallback.error) {
    throw fallback.error;
  }

  return fallback.data || [];
};

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

const buildAssigneeLabel = (assigneeIds, employeeNameMap = {}, fallbackName = '') => {
  const names = normalizeAssigneeIds(assigneeIds)
    .map(id => employeeNameMap[id] || '')
    .filter(Boolean);

  if (names.length > 0) {
    return names.join(', ');
  }

  return fallbackName || '';
};

export const mapProjectTaskRowToApp = (row, projectMeta = {}) => {
  const employeeNameMap = projectMeta.employeeNameMap || {};
  const assigneeIds = normalizeAssigneeIds(row.assignee_ids, row.assignee_id);
  const assigneeName =
    buildAssigneeLabel(assigneeIds, employeeNameMap, projectMeta.assigneeName) ||
    projectMeta.assigneeName ||
    '';

  return {
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
    assignee: assigneeName,
    assigneeId: assigneeIds[0] || row.assignee_id || '',
    assigneeIds,
    createdDate: formatTaskDate(row.created_at || row.created_date),
    taskDate: normalizeTaskDateKey(row.task_date),
    dueDate: normalizeTaskDateKey(row.due),
  };
};

export const mapAppTaskToProjectTaskRow = (task, { projectId, assigneeId, assigneeIds }) => {
  const estimated = task.estimatedHours
    ? `${String(task.estimatedHours).replace(/h$/i, '')}h`
    : null;
  const resolvedAssigneeIds = normalizeAssigneeIds(
    assigneeIds || task.assigneeIds,
    assigneeId || task.assigneeId,
  );
  const primaryAssigneeId = resolvedAssigneeIds[0] || assigneeId || task.assigneeId || '';

  return {
    id: task.id || `task-${Date.now()}`,
    project_id: projectId,
    assignee_id: primaryAssigneeId,
    assignee_ids: resolvedAssigneeIds,
    title: task.title?.trim() || 'Untitled task',
    work_notes: toWorkNotes(task.description),
    status: mapAppStatusToDb(task.status),
    priority: (task.priority || 'medium').toLowerCase(),
    task_date: toNullableText(normalizeTaskDateKey(task.taskDate)),
    due: toNullableText(normalizeTaskDateKey(task.dueDate)),
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
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).filter(row => rowAssignedToUserId(row, assigneeId));
};

export const fetchProjectTasksForProject = async projectId => {
  if (!projectId) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

const buildTaskUpdateRow = (task, { assigneeIds } = {}) => {
  const estimated = task.estimatedHours
    ? `${String(task.estimatedHours).replace(/h$/i, '')}h`
    : null;
  const resolvedAssigneeIds = normalizeAssigneeIds(
    assigneeIds || task.assigneeIds,
    task.assigneeId,
  );

  const row = {
    title: task.title?.trim() || 'Untitled task',
    work_notes: toWorkNotes(task.description),
    status: mapAppStatusToDb(task.status),
    priority: (task.priority || 'medium').toLowerCase(),
    task_date: toNullableText(normalizeTaskDateKey(task.taskDate)),
    due: toNullableText(normalizeTaskDateKey(task.dueDate)),
    est: estimated,
    updated_at: new Date().toISOString(),
  };

  if (resolvedAssigneeIds.length > 0) {
    row.assignee_id = resolvedAssigneeIds[0];
    row.assignee_ids = resolvedAssigneeIds;
  }

  return row;
};

const runInsert = async row => {
  try {
    const { data, error } = await getSupabase()
      .from(PROJECT_TASKS_TABLE)
      .insert(row)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data || row;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('assignee_ids') && row.assignee_ids) {
      const { assignee_ids: _removed, ...fallbackRow } = row;
      const { data, error: retryError } = await getSupabase()
        .from(PROJECT_TASKS_TABLE)
        .insert(fallbackRow)
        .select('*')
        .single();

      if (retryError) {
        throw retryError;
      }

      return data || fallbackRow;
    }

    throw error;
  }
};

const runUpdate = async (taskId, row) => {
  try {
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
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('assignee_ids') && row.assignee_ids) {
      const { assignee_ids: _removed, ...fallbackRow } = row;
      const { data, error: retryError } = await getSupabase()
        .from(PROJECT_TASKS_TABLE)
        .update(fallbackRow)
        .eq('id', taskId)
        .select('*')
        .single();

      if (retryError) {
        throw retryError;
      }

      return data || { id: taskId, ...fallbackRow };
    }

    throw error;
  }
};

export const createProjectTask = async (task, { projectId, assigneeId, assigneeIds, movedBy }) => {
  const row = mapAppTaskToProjectTaskRow(task, { projectId, assigneeId, assigneeIds });

  console.log('[projectTasksService] INSERT project_tasks', {
    table: PROJECT_TASKS_TABLE,
    row: JSON.stringify(row),
    projectId,
    assigneeId: row.assignee_id,
    assigneeIds: row.assignee_ids,
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
      movedBy: movedBy || row.assignee_id,
    }),
  );

  console.log('[projectTasksService] INSERT success', insertedRow);
  return insertedRow;
};

export const updateProjectTask = async (taskId, task, { movedBy, projectId, assigneeIds } = {}) => {
  const current = await fetchTaskCurrentState(taskId);
  const row = buildTaskUpdateRow(task, { assigneeIds });

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
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter(row => rowAssignedToUserId(row, assigneeId))
    .filter(row => isTaskScheduledToday(row))
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

  const data = await fetchOpenTaskRowsForAssigneeCounts();

  return data
    .filter(row => rowAssignedToUserId(row, assigneeId))
    .reduce((counts, row) => {
      counts[row.project_id] = (counts[row.project_id] || 0) + 1;
      return counts;
    }, {});
};

export const fetchOpenTaskCountsForAllProjects = async () => {
  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('project_id, status')
    .neq('status', 'done');

  if (error) {
    throw error;
  }

  return (data || []).reduce((counts, row) => {
    counts[row.project_id] = (counts[row.project_id] || 0) + 1;
    return counts;
  }, {});
};

export const fetchInProgressTaskForAssignee = async (
  assigneeId,
  { excludeTaskId, projectNameById = {} } = {},
) => {
  if (!assigneeId) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('*')
    .eq('status', 'in-progress')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  const row = (data || []).find(
    taskRow => rowAssignedToUserId(taskRow, assigneeId) && taskRow.id !== excludeTaskId,
  );

  if (!row) {
    return null;
  }

  return mapProjectTaskRowToApp(row, {
    name: projectNameById[row.project_id] || '',
  });
};

export const fetchTasksForAssignee = async (
  assigneeId,
  { projectNameById = {}, assigneeName = '', employeeNameMap = {} } = {},
) => {
  if (!assigneeId) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from(PROJECT_TASKS_TABLE)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter(row => rowAssignedToUserId(row, assigneeId))
    .map(row =>
      mapProjectTaskRowToApp(row, {
        name: projectNameById[row.project_id] || '',
        assigneeName,
        employeeNameMap,
      }),
    );
};

const isReadyForTestingDbStatus = status =>
  mapDbStatusToApp(status) === TASK_STATUS_READY_FOR_TESTING;

export const fetchReadyForTestingTasks = async ({
  projectIds = [],
  projectNameById = {},
  employeeNameMap = {},
} = {}) => {
  let rows = [];

  if (projectIds.length > 0) {
    const results = await Promise.allSettled(
      projectIds.map(projectId => fetchProjectTasksForProject(projectId)),
    );
    rows = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value || []);
  } else {
    const { data, error } = await getSupabase()
      .from(PROJECT_TASKS_TABLE)
      .select('*')
      .eq('status', 'ready-for-testing')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    rows = data || [];
  }

  return rows
    .filter(row => isReadyForTestingDbStatus(row.status))
    .map(row =>
      mapProjectTaskRowToApp(row, {
        name: projectNameById[row.project_id] || '',
        assigneeName: employeeNameMap[row.assignee_id] || '',
      }),
    );
};

export const fetchTeamLeaderTasks = async ({
  assigneeId,
  projectIds = [],
  projectNameById = {},
  employeeNameMap = {},
  assigneeName = '',
} = {}) => {
  let readyTasks = [];
  let assignedTasks = [];

  try {
    readyTasks = await fetchReadyForTestingTasks({
      projectIds,
      projectNameById,
      employeeNameMap,
    });
  } catch (error) {
    console.log('[projectTasksService] fetchReadyForTestingTasks failed', error?.message);
  }

  if (assigneeId) {
    try {
      assignedTasks = await fetchTasksForAssignee(assigneeId, {
        projectNameById,
        assigneeName,
      });
    } catch (error) {
      console.log('[projectTasksService] fetchTasksForAssignee failed', error?.message);
    }
  }

  const assignedOpenTasks = assignedTasks.filter(task => task.status !== TASK_FILTER_DONE);
  const merged = new Map();

  readyTasks.forEach(task => merged.set(task.id, task));
  assignedOpenTasks.forEach(task => {
    if (!merged.has(task.id)) {
      merged.set(task.id, task);
    }
  });

  return Array.from(merged.values());
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
    matchesRow: row => row.project_id === projectId && rowAssignedToUserId(row, assigneeId),
    onChange,
  });
};

export const subscribeToAllProjectTasksChanges = onChange =>
  subscribeToProjectTasksTable({
    channelPrefix: 'all-project-tasks',
    onChange,
  });
