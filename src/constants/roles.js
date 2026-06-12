export const COMMAND_CENTER_VERSION = 'COMMAND CENTER · V2.4';

export const ROLE_SELECTION_TITLE = 'Select Your Role';
export const ROLE_SELECTION_SUBTITLE = 'Choose your access level to continue';

export const LOGGING_IN_AS = 'Logging in as';
export const CHANGE_ROLE = 'Change role';

export const EMPLOYEE_ROLE_ID = 'employee';

export const isEmployeeUser = user => {
  const selectedRoleId = String(user?.selectedRoleId || '').toLowerCase();
  const role = String(user?.role || '').toLowerCase();

  return selectedRoleId === EMPLOYEE_ROLE_ID || role === EMPLOYEE_ROLE_ID;
};

export const COMING_SOON_TITLE = 'Coming Soon';
export const COMING_SOON_MESSAGE =
  'This role\'s features are currently under development and will be available soon. Please select Employee to continue for now.';
export const COMING_SOON_BUTTON = 'Got it';

export const ROLES = [
  {
    id: 'ceo_admin',
    title: 'CEO / Admin',
    description: 'Full platform access',
    icon: 'briefcase',
    bgColor: '#7C5CBF',
  },
  {
    id: 'team_leader',
    title: 'Team Leader',
    description: 'Team management & approvals',
    icon: 'users',
    bgColor: '#4A7FD4',
  },
  {
    id: 'employee',
    title: 'Employee',
    description: 'Personal tasks & time tracking',
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
