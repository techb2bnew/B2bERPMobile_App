import {
  TASK_FILTER_DONE,
  TASK_FILTER_IN_PROGRESS,
  TASK_FILTER_TODO,
  TASK_STATUS_READY_FOR_TESTING,
} from '../constants/Constants';
import {
  createRealtimeChannelName,
  getSupabase,
  syncSupabaseRealtimeAuth,
} from '../lib/supabase';
import {
  formatTaskDate,
  formatTaskEstimateHours,
  getUserId,
  getUserName,
  isCreatedToday,
  isProjectAssignedToUser,
  taskAssignedToUser,
} from '../utils/projectUtils';

const PROJECTS_TABLE = 'projects';

const DB_STATUS_TO_APP = {
  todo: TASK_FILTER_TODO,
  'to do': TASK_FILTER_TODO,
  'in-progress': TASK_FILTER_IN_PROGRESS,
  in_progress: TASK_FILTER_IN_PROGRESS,
  'in progress': TASK_FILTER_IN_PROGRESS,
  review: TASK_STATUS_READY_FOR_TESTING,
  'ready-for-testing': TASK_STATUS_READY_FOR_TESTING,
  ready_for_testing: TASK_STATUS_READY_FOR_TESTING,
  'ready for testing': TASK_STATUS_READY_FOR_TESTING,
  done: TASK_FILTER_DONE,
};

const APP_STATUS_TO_DB = {
  [TASK_FILTER_TODO]: 'todo',
  [TASK_FILTER_IN_PROGRESS]: 'in-progress',
  [TASK_STATUS_READY_FOR_TESTING]: 'ready-for-testing',
  [TASK_FILTER_DONE]: 'done',
};

const isTaskEntry = task => task?.entryType !== 'timesheet';

export const mapDbStatusToApp = status => {
  if (!status) {
    return TASK_FILTER_TODO;
  }
  return DB_STATUS_TO_APP[String(status).toLowerCase()] || TASK_FILTER_TODO;
};

export const mapAppStatusToDb = status => {
  return APP_STATUS_TO_DB[status] || 'todo';
};

export const mapDbTaskToApp = (task, project) => ({
  id: task.id,
  title: task.title || 'Untitled task',
  description: task.workNotes || task.description || '',
  status: mapDbStatusToApp(task.status),
  priority: (task.priority || 'medium').toLowerCase(),
  project: project?.name || '',
  projectId: project?.id || '',
  estimatedHours: String(task.est || task.estimatedHours || '').replace(/h$/i, ''),
  estimateLabel: formatTaskEstimateHours(task.est || task.estimatedHours),
  hoursWorked: task.est
    ? `${formatTaskEstimateHours(task.est || task.estimatedHours)} est`
    : task.hoursWorked || '',
  assignee: task.assignee || '',
  assigneeId: task.assigneeId || task.employeeId || '',
  createdDate: formatTaskDate(task.created_at || task.created_date),
  dueDate: formatTaskDate(task.due || task.dueDate),
});

export const mapAppTaskToDb = task => ({
  id: task.id || `task-${Date.now()}`,
  title: task.title?.trim() || 'Untitled task',
  workNotes: task.description?.trim() || '',
  status: mapAppStatusToDb(task.status),
  priority: (task.priority || 'medium').toLowerCase(),
  assignee: task.assignee?.trim() || '',
  assigneeId: task.assigneeId || '',
  due: task.dueDate?.trim() || '',
  est: task.estimatedHours ? `${task.estimatedHours}`.replace(/h$/i, '') + 'h' : '',
  entryType: 'task',
});

export const subscribeToProjectsChanges = onChange => {
  let active = true;
  let channel = null;
  const onChangeRef = { current: onChange };
  onChangeRef.current = onChange;

  const connect = async () => {
    if (!active) {
      return;
    }

    await syncSupabaseRealtimeAuth();

    if (!active) {
      return;
    }

    if (channel) {
      getSupabase().removeChannel(channel);
      channel = null;
    }

    const supabase = getSupabase();
    channel = supabase
      .channel(createRealtimeChannelName('projects-realtime'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: PROJECTS_TABLE },
        () => {
          onChangeRef.current();
        },
      )
      .subscribe();
  };

  connect();

  return () => {
    active = false;
    if (channel) {
      getSupabase().removeChannel(channel);
    }
  };
};

export const fetchAllProjects = async () => {
  const { data, error } = await getSupabase().from(PROJECTS_TABLE).select('*').order('name');

  if (error) {
    throw error;
  }

  return data || [];
};

export const fetchProjectsForUser = async user => {
  if (!getUserId(user) && !getUserName(user)) {
    return [];
  }

  const projects = await fetchAllProjects();
  return projects.filter(project => isProjectAssignedToUser(project, user));
};

export const fetchProjectById = async projectId => {
  const { data, error } = await getSupabase()
    .from(PROJECTS_TABLE)
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const getProjectTasks = project => {
  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];

  return tasks.filter(isTaskEntry).map(task => mapDbTaskToApp(task, project));
};

export const getTodayTasksForUser = (projects, user) => {
  const todayTasks = [];

  projects.forEach(project => {
    const tasks = Array.isArray(project.tasks) ? project.tasks : [];

    tasks.forEach(task => {
      if (!isTaskEntry(task)) {
        return;
      }

      if (!taskAssignedToUser(task, user)) {
        return;
      }

      if (!isCreatedToday(task.created_at || task.created_date)) {
        return;
      }

      todayTasks.push(mapDbTaskToApp(task, project));
    });
  });

  return todayTasks;
};

export const mergeTasksForProject = (existingTasks, appTasks) => {
  const timesheetEntries = (existingTasks || []).filter(task => task?.entryType === 'timesheet');
  const taskEntries = appTasks.map(mapAppTaskToDb);
  return [...timesheetEntries, ...taskEntries];
};

export const updateProjectTasks = async (projectId, appTasks, existingTasks = []) => {
  const mergedTasks = mergeTasksForProject(existingTasks, appTasks);

  const { data, error } = await getSupabase()
    .from(PROJECTS_TABLE)
    .update({ tasks: mergedTasks })
    .eq('id', projectId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};
