export const COMMAND_CENTER_VERSION = 'COMMAND CENTER · V2.4';

export const ROLE_SELECTION_TITLE = 'Select Your Role';
export const ROLE_SELECTION_SUBTITLE = 'Choose your access level to continue';

export const LOGGING_IN_AS = 'Logging in as';
export const CHANGE_ROLE = 'Change role';

export const EMPLOYEE_ROLE_ID = 'employee';
export const TEAM_LEADER_ROLE_ID = 'team_leader';
export const CEO_ADMIN_ROLE_ID = 'ceo_admin';

export const LOGIN_ENABLED_ROLE_IDS = [
  EMPLOYEE_ROLE_ID,
  TEAM_LEADER_ROLE_ID,
  CEO_ADMIN_ROLE_ID,
];

export const REVIEWER_ROLE_IDS = [TEAM_LEADER_ROLE_ID, CEO_ADMIN_ROLE_ID];

const normalizeProfileRole = role =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const EMPLOYEE_PROFILE_ROLES = new Set([
  'employee',
  'developer',
  'backend developer',
  'frontend developer',
]);

const TEAM_LEADER_PROFILE_ROLES = new Set([
  'manager',
  'team lead',
  'team leader',
  'tester',
]);

const CEO_PROFILE_ROLES = new Set(['ceo / admin', 'ceo admin', 'ceo/admin']);

const PROFILE_ROLE_SETS_BY_LOGIN = {
  [EMPLOYEE_ROLE_ID]: EMPLOYEE_PROFILE_ROLES,
  [TEAM_LEADER_ROLE_ID]: TEAM_LEADER_PROFILE_ROLES,
  [CEO_ADMIN_ROLE_ID]: CEO_PROFILE_ROLES,
};

export const getLoginCategoryForProfileRole = profileRole => {
  const normalized = normalizeProfileRole(profileRole);

  if (!normalized) {
    return null;
  }

  if (EMPLOYEE_PROFILE_ROLES.has(normalized)) {
    return EMPLOYEE_ROLE_ID;
  }

  if (TEAM_LEADER_PROFILE_ROLES.has(normalized)) {
    return TEAM_LEADER_ROLE_ID;
  }

  if (CEO_PROFILE_ROLES.has(normalized)) {
    return CEO_ADMIN_ROLE_ID;
  }

  return null;
};

export const profileMatchesLoginRole = (profileRole, selectedRoleId) => {
  const loginId = String(selectedRoleId || '').toLowerCase();
  const normalized = normalizeProfileRole(profileRole);
  const allowedRoles = PROFILE_ROLE_SETS_BY_LOGIN[loginId];

  if (!allowedRoles || !normalized) {
    return false;
  }

  return allowedRoles.has(normalized);
};

export const LOGIN_ROLE_MISMATCH_MESSAGE =
  'This account cannot sign in with the selected role. Please go back and choose the correct role.';

const getUserRoleIds = user => {
  const selectedRoleId = String(user?.selectedRoleId || '').toLowerCase();
  const role = String(user?.role || '').toLowerCase();
  return { selectedRoleId, role };
};

export const isEmployeeUser = user => {
  const { selectedRoleId } = getUserRoleIds(user);

  if (selectedRoleId === EMPLOYEE_ROLE_ID) {
    return true;
  }

  return getLoginCategoryForProfileRole(user?.role) === EMPLOYEE_ROLE_ID;
};

export const isReviewerUser = user => {
  const { selectedRoleId } = getUserRoleIds(user);

  if (REVIEWER_ROLE_IDS.includes(selectedRoleId)) {
    return true;
  }

  const profileCategory = getLoginCategoryForProfileRole(user?.role);
  return profileCategory === TEAM_LEADER_ROLE_ID || profileCategory === CEO_ADMIN_ROLE_ID;
};

export const isTeamLeaderUser = user => {
  const { selectedRoleId } = getUserRoleIds(user);

  if (selectedRoleId === TEAM_LEADER_ROLE_ID) {
    return true;
  }

  return getLoginCategoryForProfileRole(user?.role) === TEAM_LEADER_ROLE_ID;
};

export const isCeoAdminUser = user => {
  const { selectedRoleId } = getUserRoleIds(user);

  if (selectedRoleId === CEO_ADMIN_ROLE_ID) {
    return true;
  }

  return getLoginCategoryForProfileRole(user?.role) === CEO_ADMIN_ROLE_ID;
};

export const getCabinAlertMessage = user =>
  isCeoAdminUser(user)
    ? 'Please come to the CEO cabin.'
    : 'Please come to the manager cabin.';

export const COMING_SOON_TITLE = 'Coming Soon';
export const COMING_SOON_MESSAGE =
  'This role\'s features are currently under development and will be available soon. Please select Employee to continue for now.';
export const COMING_SOON_BUTTON = 'Got it';

export const ROLES = [
  {
    id: 'ceo_admin',
    title: 'CEO / Admin',
    description: 'CEO / Admin profile login',
    icon: 'briefcase',
    bgColor: '#7C5CBF',
  },
  {
    id: 'team_leader',
    title: 'Team Leader',
    description: 'Manager, Team Lead & Tester',
    icon: 'users',
    bgColor: '#4A7FD4',
  },
  {
    id: 'employee',
    title: 'Employee',
    description: 'Developer, Backend/Frontend & Employee',
    icon: 'user-check',
    bgColor: '#9B59B6',
  },
  // {
  //   id: 'developer',
  //   title: 'Developer',
  //   description: 'Sprint, bugs & code metrics',
  //   icon: 'code',
  //   bgColor: '#3498DB',
  // },
  // {
  //   id: 'designer',
  //   title: 'Designer',
  //   description: 'Projects, revisions & approvals',
  //   icon: 'star',
  //   bgColor: '#E8557A',
  // },
  // {
  //   id: 'marketing',
  //   title: 'Marketing',
  //   description: 'Campaigns, leads & ROI',
  //   icon: 'trending-up',
  //   bgColor: '#F47C20',
  // },
  {
    id: 'hr_manager',
    title: 'HR Manager',
    description: 'People, payroll & hiring',
    icon: 'award',
    bgColor: '#3B9B9B',
  },
];
