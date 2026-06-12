const MONTH_MAP = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const AVATAR_COLORS = ['#9B59B6', '#2D7DD2', '#E84393', '#F47C20', '#3B9B9B', '#3498DB'];

export const getUserId = user => user?.id || '';

export const getUserName = user => user?.name?.trim() || '';

const normalizeValue = value => String(value || '').trim().toLowerCase();

export const isUuid = value => UUID_REGEX.test(String(value || '').trim());

export const getTeamMemberId = member => {
  if (!member) {
    return '';
  }

  if (typeof member === 'string') {
    return isUuid(member) ? member.trim() : '';
  }

  if (typeof member === 'object') {
    return member.id || member.employeeId || '';
  }

  return '';
};

export const getTeamMemberName = (member, employeeNameMap = {}) => {
  if (!member) {
    return '';
  }

  if (typeof member === 'object') {
    return member.name || member.label || employeeNameMap[member.id] || '';
  }

  if (typeof member === 'string') {
    if (isUuid(member)) {
      return employeeNameMap[member] || '';
    }
    return member;
  }

  return String(member);
};

export const teamEntryMatchesUser = (entry, user) => {
  const userId = getUserId(user);
  const userName = getUserName(user);

  if (!entry || (!userId && !userName)) {
    return false;
  }

  if (typeof entry === 'object') {
    const entryId = getTeamMemberId(entry);
    const entryName = entry.name || entry.label || '';

    if (userId && entryId && userId === entryId) {
      return true;
    }

    if (userName && entryName && normalizeValue(userName) === normalizeValue(entryName)) {
      return true;
    }

    return false;
  }

  if (typeof entry === 'string') {
    if (userId && isUuid(entry) && entry === userId) {
      return true;
    }

    if (userName && !isUuid(entry) && normalizeValue(entry) === normalizeValue(userName)) {
      return true;
    }
  }

  return false;
};

export const isUserInTeam = (team, user) => {
  if (!Array.isArray(team) || (!getUserId(user) && !getUserName(user))) {
    return false;
  }

  return team.some(entry => teamEntryMatchesUser(entry, user));
};

export const taskAssignedToUser = (task, user) => {
  const userId = getUserId(user);
  if (!userId || !task) {
    return false;
  }

  return task.assigneeId === userId || task.employeeId === userId;
};

export const isProjectAssignedToUser = (project, user) => {
  if (!project || (!getUserId(user) && !getUserName(user))) {
    return false;
  }

  return isUserInTeam(project.team, user);
};

export const getTodayDueDateLabel = () => {
  const today = new Date();
  return today.toLocaleString('en-US', { month: 'short', day: 'numeric' });
};

export const parseDueDateToKey = value => {
  if (!value) {
    return '';
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const parsedMs = Date.parse(trimmed);
  if (!Number.isNaN(parsedMs)) {
    const date = new Date(parsedMs);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parts = trimmed.split(/\s+/);
  const month = MONTH_MAP[parts[0]];
  const day = Number.parseInt(parts[1], 10);
  const year = parts[2] ? Number.parseInt(parts[2], 10) : new Date().getFullYear();

  if (month != null && !Number.isNaN(day)) {
    const date = new Date(year, month, day);
    const isoMonth = String(date.getMonth() + 1).padStart(2, '0');
    const isoDay = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${isoMonth}-${isoDay}`;
  }

  return '';
};

export const formatTaskDate = value => {
  if (!value) {
    return '';
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }

  const parts = trimmed.split(/\s+/);
  const month = MONTH_MAP[parts[0]];
  const day = Number.parseInt(parts[1], 10);
  const year = parts[2] ? Number.parseInt(parts[2], 10) : new Date().getFullYear();

  if (month != null && !Number.isNaN(day)) {
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return trimmed;
};

export const formatTaskEstimateHours = value => {
  const cleaned = String(value || '').replace(/h$/i, '').trim();
  return cleaned ? `${cleaned}h` : '';
};

export const isCreatedToday = dateValue => {
  if (!dateValue) {
    return false;
  }

  const created = new Date(dateValue);
  if (Number.isNaN(created.getTime())) {
    const dateText = String(dateValue).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      const today = new Date();
      return dateText === today.toISOString().slice(0, 10);
    }
    return false;
  }

  const today = new Date();
  return (
    created.getFullYear() === today.getFullYear() &&
    created.getMonth() === today.getMonth() &&
    created.getDate() === today.getDate()
  );
};

export const isDueToday = dueValue => {
  if (!dueValue) {
    return false;
  }

  const dueText = String(dueValue).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dueText)) {
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);
    return dueText === isoToday;
  }

  const [monthLabel, dayLabel] = dueText.split(/\s+/);
  const month = MONTH_MAP[monthLabel];
  const day = Number.parseInt(dayLabel, 10);

  if (month == null || Number.isNaN(day)) {
    return false;
  }

  const today = new Date();
  return today.getMonth() === month && today.getDate() === day;
};

export const getMemberInitial = label => {
  if (!label) {
    return '?';
  }
  return String(label).trim().charAt(0).toUpperCase();
};

export const getMemberColor = index => AVATAR_COLORS[index % AVATAR_COLORS.length];

export const buildEmployeeNameMap = employees => {
  if (!Array.isArray(employees)) {
    return {};
  }

  return employees.reduce((map, employee) => {
    if (employee?.id) {
      map[employee.id] = employee.name || '';
    }
    return map;
  }, {});
};

export const countOpenTasks = tasks => {
  if (!Array.isArray(tasks)) {
    return 0;
  }

  return tasks.filter(
    task =>
      task?.entryType !== 'timesheet' &&
      task?.status !== 'done' &&
      task?.status !== 'Done',
  ).length;
};
