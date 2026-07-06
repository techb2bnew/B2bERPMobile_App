import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { getLocalDateKey } from './clockSessionsService';
import { isCeoAdminUser } from '../constants/roles';

const CLOCK_SESSIONS_TABLE = 'clock_sessions';
const CLOCK_SESSION_SEGMENTS_TABLE = 'clock_session_segments';
const LEAVE_REQUESTS_TABLE = 'leave_requests';
const EMPLOYEE_PROFILES_TABLE = 'employee_profiles';

// Mock list of employees for fallback
const MOCK_EMPLOYEES = [
  { id: 'emp-1', name: 'Kartik', role: 'Developer', dept: 'Digital Marketing', salary: 35000 },
  { id: 'emp-2', name: 'Abhishek Thakur', role: 'Developer', dept: 'Digital Marketing', salary: 40000 },
  { id: 'emp-3', name: 'Saravjeet Singh', role: 'Developer', dept: 'Digital Marketing', salary: 38000 },
  { id: 'emp-4', name: 'Anila Iqbal', role: 'Developer', dept: 'Development', salary: 45000 },
  { id: 'emp-5', name: 'Rajnish Kaur', role: 'UI Designer', dept: 'Digital Marketing', salary: 32000 },
  { id: 'emp-6', name: 'Gurbaksh Singh', role: 'Senior Developer', dept: 'Development', salary: 60000 },
  { id: 'emp-7', name: 'Saurabh Bhatia', role: 'Manager', dept: 'Management', salary: 75000 },
];

// Helper to get number of days in a month
export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// Helper to check if a date is Sunday or Saturday (except the last Saturday of the month)
export const isWeeklyOffDate = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return true; // Sunday is off
  if (dayOfWeek === 6) {
    // Saturday is off, EXCEPT the last Saturday of the month
    const nextWeek = new Date(year, month - 1, day + 7);
    const isLastSaturday = nextWeek.getMonth() !== (month - 1);
    return !isLastSaturday;
  }
  return false;
};

export const getCurrentHrmsMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getRecentHrmsMonths = (count = 4) => {
  const months = [];
  const now = new Date();

  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push({
      key: `${year}-${month}`,
      label: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    });
  }

  return months;
};

// Dynamic date generator for a month
export const getMonthDatesList = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = getDaysInMonth(year, month);
  const dates = [];
  for (let d = 1; d <= totalDays; d++) {
    const dayStr = String(d).padStart(2, '0');
    dates.push(`${monthKey}-${dayStr}`);
  }
  return dates;
};

// Shift configuration:
export const SHIFT_FULL_DAY_HOURS = 8.0;    // Net working hours required for full day
export const SHIFT_SHORT_LEAVE_HOURS = 6.0; // Short Leave threshold (worked ≥ 6h but < 8h)
export const SHIFT_HALF_DAY_HOURS = 4.5;    // Half Day threshold (worked ≥ 4.5h but < 6h)

export const HRMS_STATUS_DISPLAY = {
  'Full Day': { letter: 'P', color: '#3DDC84', label: 'Full Day' },
  'Present': { letter: 'P', color: '#1ABC9C', label: 'Present' },
  'Short Leave': { letter: 'SL', color: '#D35400', label: 'Short Leave' },
  'Half Day': { letter: 'H', color: '#F39C12', label: 'Half Day' },
  'Absent': { letter: 'A', color: '#F85149', label: 'Absent' },
  'Leave': { letter: 'L', color: '#F85149', label: 'Leave' },
  'Paid Leave': { letter: 'PL', color: '#3498DB', label: 'Paid Leave' },
  'Unpaid Leave': { letter: 'UL', color: '#F85149', label: 'Unpaid Leave' },
  'Sandwich Leave': { letter: 'SW', color: '#E85D5D', label: 'Sandwich Leave' },
  'Weekly Off': { letter: 'O', color: '#555555', label: 'Weekly Off' },
  'No Record': { letter: '-', color: '#333333', label: 'No Record' },
  'Future': { letter: '-', color: '#333333', label: 'Future' },
};

export const getHrmsStatusDisplay = (status) =>
  HRMS_STATUS_DISPLAY[status] || { letter: '-', color: '#444444', label: status || 'Unknown' };

const filterHrmsAttendanceEmployees = (employees = []) =>
  employees.filter(emp => !isCeoAdminUser({ role: emp?.role }));

// Calculate attendance status based on work hours, leave records, and calendar day type
export const calculateDayStatus = ({ hoursWorked, hasFullLeave, hasHalfLeave, isWeeklyOff, hasClockOut, hasClockIn }) => {
  // Full Day: net hours >= 8h takes priority over everything else
  if (hoursWorked >= SHIFT_FULL_DAY_HOURS) {
    return 'Full Day';
  }
  // Leave takes priority (approved full-day leave)
  if (hasFullLeave) {
    return 'Leave';
  }
  // Short Leave: worked ≥ 6h but < 8h
  if (hoursWorked >= SHIFT_SHORT_LEAVE_HOURS) {
    return 'Short Leave';
  }
  // Half Day: approved half-leave OR worked >= 4.5h
  if (hasHalfLeave || hoursWorked >= SHIFT_HALF_DAY_HOURS) {
    return 'Half Day';
  }
  // Weekly Off only if no work done
  if (isWeeklyOff && hoursWorked === 0) {
    return 'Weekly Off';
  }
  // Clocked in but no clock-out on a past day with 0 hours = Absent
  if (hasClockIn && !hasClockOut && hoursWorked === 0) {
    return 'Absent';
  }
  // Present: worked > 0 but < 4.5h
  if (hoursWorked > 0) {
    return 'Present';
  }
  return 'Absent';
};

// Main aggregator function for admin board
export const fetchHrmsMonthlyData = async (monthKey) => {
  if (!isSupabaseConfigured) {
    return generateMockHrmsData(monthKey);
  }

  try {
    const supabase = getSupabase();
    const [year, month] = monthKey.split('-').map(Number);
    const lastDay = getDaysInMonth(year, month);
    
    const startOfMonth = `${monthKey}-01T00:00:00.000Z`;
    const endOfMonth = `${monthKey}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    // 1. Fetch all employees (resilient to missing salary column)
    let employees = [];
    const { data: empsWithSalary, error: empError } = await supabase
      .from(EMPLOYEE_PROFILES_TABLE)
      .select('id, name, role, dept, salary')
      .order('name');

    if (empError) {
      console.warn('Failed to fetch salary column, fetching without it:', empError.message);
      const { data: empsNoSalary, error: fallbackError } = await supabase
        .from(EMPLOYEE_PROFILES_TABLE)
        .select('id, name, role, dept')
        .order('name');

      if (fallbackError) throw fallbackError;
      employees = (empsNoSalary || []).map(emp => ({
        ...emp,
        base_salary: 0, // Fallback to 0 so we see warning
      }));
    } else {
      employees = (empsWithSalary || []).map(emp => ({
        ...emp,
        base_salary: emp.salary || 0,
      }));
    }

    employees = filterHrmsAttendanceEmployees(employees);

    // 2. Fetch all clock sessions for the month (with IDs for segment lookup)
    const { data: clockSessions, error: clockError } = await supabase
      .from(CLOCK_SESSIONS_TABLE)
      .select('id, employee_id, clock_in, clock_out, hours')
      .gte('clock_in', startOfMonth)
      .lte('clock_in', endOfMonth);

    if (clockError) throw clockError;

    // 2b. Fetch all segments for these sessions
    let clockSegments = [];
    if (clockSessions && clockSessions.length > 0) {
      const sessionIds = clockSessions.map(s => s.id);
      const { data: segsData, error: segErr } = await supabase
        .from(CLOCK_SESSION_SEGMENTS_TABLE)
        .select('session_id, kind, label, started_at, ended_at')
        .in('session_id', sessionIds)
        .order('started_at', { ascending: true });

      if (!segErr) {
        clockSegments = segsData || [];
      }
    }

    // 3. Fetch all approved leaves for the whole quarter overlapping with the month
    const quarter = Math.ceil(month / 3);
    const quarterStartMonth = (quarter - 1) * 3 + 1;
    const quarterStart = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01T00:00:00.000Z`;

    const { data: approvedLeaves, error: leaveError } = await supabase
      .from(LEAVE_REQUESTS_TABLE)
      .select('employee_id, start_date, end_date, leave_type')
      .eq('status', 'Approved')
      .lte('start_date', endOfMonth)
      .gte('end_date', quarterStart);

    if (leaveError) throw leaveError;

    return processHrmsAggregation(monthKey, employees || [], clockSessions || [], approvedLeaves || [], clockSegments);
  } catch (error) {
    console.error('Error fetching HRMS monthly data:', error);
    return generateMockHrmsData(monthKey);
  }
};

// Aggregate database queries into month-wise matrix
// segments: array of { session_id, kind, label, started_at, ended_at }
const processHrmsAggregation = (monthKey, employees, clockSessions, approvedLeaves, segments = []) => {
  const attendanceEmployees = filterHrmsAttendanceEmployees(employees);
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = getDaysInMonth(year, month);
  const datesList = getMonthDatesList(monthKey);

  // Build session_id → employee_id map for segment lookup
  const sessionEmpMap = {}; // { sessionId: employeeId }
  const sessionDateMap = {}; // { sessionId: dateKey }
  clockSessions.forEach(session => {
    if (session.id) {
      sessionEmpMap[session.id] = session.employee_id;
      sessionDateMap[session.id] = getLocalDateKey(new Date(session.clock_in));
    }
  });

  // Compute meeting and break (lunch/tea) minutes per employee per day from segments
  // meetingMins: kind='break' AND label contains 'meeting'
  // breakMins:   kind='break' AND label does NOT contain 'meeting' (lunch, tea, personal, etc.)
  const meetingMinsMap = {}; // { employeeId: { dateKey: mins } }
  const breakMinsMap = {};   // { employeeId: { dateKey: mins } }

  segments.forEach(seg => {
    // We want to process breaks AND meetings
    if (seg.kind === 'working' || seg.kind === 'idle') return;

    const empId = sessionEmpMap[seg.session_id];
    const dateKey = sessionDateMap[seg.session_id];
    if (!empId || !dateKey) return;

    const start = new Date(seg.started_at).getTime();
    const end = seg.ended_at ? new Date(seg.ended_at).getTime() : Date.now();
    const diffMins = Math.max(0, Math.round((end - start) / 60000));

    const isMeeting = seg.kind === 'meeting' || (seg.label && seg.label.toLowerCase().includes('meeting'));

    if (isMeeting) {
      if (!meetingMinsMap[empId]) meetingMinsMap[empId] = {};
      meetingMinsMap[empId][dateKey] = (meetingMinsMap[empId][dateKey] || 0) + diffMins;
    } else {
      if (!breakMinsMap[empId]) breakMinsMap[empId] = {};
      breakMinsMap[empId][dateKey] = (breakMinsMap[empId][dateKey] || 0) + diffMins;
    }
  });

  // Group clock sessions by employee and date key
  const workHoursMap = {}; // { employeeId: { dateKey: hours } }
  const workSessionsMap = {}; // { employeeId: { dateKey: boolean } }
  const workClockInMap = {}; // { employeeId: { dateKey: string } }
  const workClockOutMap = {}; // { employeeId: { dateKey: string } }
  const workClockOutPresentMap = {}; // { employeeId: { dateKey: boolean } } — tracks if any session has clock_out

  clockSessions.forEach(session => {
    const dateKey = getLocalDateKey(new Date(session.clock_in));
    if (!workHoursMap[session.employee_id]) {
      workHoursMap[session.employee_id] = {};
    }
    if (!workSessionsMap[session.employee_id]) {
      workSessionsMap[session.employee_id] = {};
    }
    if (!workClockInMap[session.employee_id]) {
      workClockInMap[session.employee_id] = {};
    }
    if (!workClockOutMap[session.employee_id]) {
      workClockOutMap[session.employee_id] = {};
    }
    if (!workClockOutPresentMap[session.employee_id]) {
      workClockOutPresentMap[session.employee_id] = {};
    }

    workHoursMap[session.employee_id][dateKey] = (workHoursMap[session.employee_id][dateKey] || 0) + (Number(session.hours) || 0);
    workSessionsMap[session.employee_id][dateKey] = true;

    const curIn = session.clock_in;
    const existingIn = workClockInMap[session.employee_id][dateKey];
    if (!existingIn || curIn < existingIn) {
      workClockInMap[session.employee_id][dateKey] = curIn;
    }

    const curOut = session.clock_out;
    if (curOut) {
      const existingOut = workClockOutMap[session.employee_id][dateKey];
      if (!existingOut || curOut > existingOut) {
        workClockOutMap[session.employee_id][dateKey] = curOut;
      }
      // At least one session has clock_out for this day
      workClockOutPresentMap[session.employee_id][dateKey] = true;
    }
  });

  // Map leaves by employee and dates covered
  const leavesMap = {}; // { employeeId: { dateKey: leaveType } }
  approvedLeaves.forEach(leave => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const cursor = new Date(start);

    while (cursor <= end) {
      const dateKey = getLocalDateKey(cursor);
      if (dateKey.startsWith(monthKey)) {
        if (!leavesMap[leave.employee_id]) {
          leavesMap[leave.employee_id] = {};
        }
        leavesMap[leave.employee_id][dateKey] = leave.leave_type;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const employeeData = attendanceEmployees.map(emp => {
    const dayWise = {};
    const todayKey = getLocalDateKey();

    // Pass 1: Build raw status for all dates
    datesList.forEach((dateKey, index) => {
      const day = index + 1;
      const workingHours = workHoursMap[emp.id]?.[dateKey] || 0;
      const meetingMins = meetingMinsMap[emp.id]?.[dateKey] || 0;
      const breakMins = breakMinsMap[emp.id]?.[dateKey] || 0;
      const hoursWorked = workingHours + (meetingMins / 60);
      const hasSessionToday = workSessionsMap[emp.id]?.[dateKey] === true;
      const leaveType = leavesMap[emp.id]?.[dateKey];
      const hasFullLeave = leaveType && leaveType !== 'Half Day' && leaveType !== 'Short Leave';
      const hasHalfLeave = leaveType === 'Half Day';
      const isWeeklyOff = isWeeklyOffDate(year, month, day);
      const isFuture = dateKey > todayKey;
      const isBeforeStart = dateKey < '2026-06-24';
      const clockInVal = workClockInMap[emp.id]?.[dateKey] || null;
      const clockOutVal = workClockOutMap[emp.id]?.[dateKey] || null;
      const hasClockOut = workClockOutPresentMap[emp.id]?.[dateKey] === true;
      const hasClockIn = hasSessionToday;

      let totalMins = 0;
      if (clockInVal && clockOutVal) {
        totalMins = Math.round((new Date(clockOutVal) - new Date(clockInVal)) / 60000);
      } else if (clockInVal && dateKey === todayKey) {
        totalMins = Math.round((Date.now() - new Date(clockInVal)) / 60000);
      }
      const lunchMins = breakMins;

      let status = 'Absent';
      if (isBeforeStart) {
        status = 'No Record';
      } else if (isFuture) {
        status = 'Future';
      } else if (dateKey === todayKey) {
        if (hasSessionToday) {
          if (hoursWorked >= SHIFT_FULL_DAY_HOURS) status = 'Full Day';
          else if (hoursWorked >= SHIFT_SHORT_LEAVE_HOURS) status = hasClockOut ? 'Short Leave' : 'Present';
          else if (hoursWorked >= SHIFT_HALF_DAY_HOURS) status = hasClockOut ? 'Half Day' : 'Present';
          else status = 'Present'; // Actively working
        } else if (isWeeklyOff) {
          status = 'Weekly Off';
        } else {
          status = 'Absent';
        }
      } else {
        status = calculateDayStatus({ hoursWorked, hasFullLeave, hasHalfLeave, isWeeklyOff, hasClockOut, hasClockIn });
      }

      dayWise[dateKey] = {
        status, hours: hoursWorked, workingHours, clockIn: clockInVal, clockOut: clockOutVal,
        totalMins, lunchMins, meetingMins, breakMins,
      };
    });

    // Pass 2a: Sandwich Leave Engine
    // A weekly off is sandwiched if the nearest working day before AND after it in the same month are both Leave/Absent
    for (let i = 0; i < datesList.length; i++) {
      if (dayWise[datesList[i]].status === 'Weekly Off') {
        // Find preceding working day
        let prevStatus = null;
        for (let j = i - 1; j >= 0; j--) {
          if (dayWise[datesList[j]].status !== 'Weekly Off' && dayWise[datesList[j]].status !== 'No Record') {
            prevStatus = dayWise[datesList[j]].status;
            break;
          }
        }
        // Find succeeding working day
        let nextStatus = null;
        for (let j = i + 1; j < datesList.length; j++) {
          if (dayWise[datesList[j]].status !== 'Weekly Off' && dayWise[datesList[j]].status !== 'Future') {
            nextStatus = dayWise[datesList[j]].status;
            break;
          }
        }

        const isPrevLeave = prevStatus === 'Leave' || prevStatus === 'Absent' || prevStatus === 'Unpaid Leave';
        const isNextLeave = nextStatus === 'Leave' || nextStatus === 'Absent' || nextStatus === 'Unpaid Leave';

        if (isPrevLeave && isNextLeave) {
          dayWise[datesList[i]].status = 'Sandwich Leave';
        }
      }
    }

    // Pass 2b: Quarter Leave Engine
    const quarterStartStr = `${year}-${String((Math.ceil(month / 3) - 1) * 3 + 1).padStart(2, '0')}-01`;
    let pastQuarterLeaves = 0;
    // Count leaves taken in the quarter before this month
    approvedLeaves.forEach(leave => {
      if (leave.employee_id === emp.id) {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const cursor = new Date(start);
        while (cursor <= end) {
          const dKey = getLocalDateKey(cursor);
          if (dKey >= quarterStartStr && dKey < `${year}-${String(month).padStart(2, '0')}-01` && leave.leave_type !== 'Half Day' && leave.leave_type !== 'Short Leave') {
            pastQuarterLeaves++;
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    });

    let currentQuarterLeaves = pastQuarterLeaves;
    
    // Pass 3: Final Counters and Pay Deductions
    let presentCount = 0, halfDayCount = 0, absentCount = 0, paidLeaveCount = 0, unpaidLeaveCount = 0;
    let weeklyOffCount = 0, sandwichLeaveCount = 0;

    datesList.forEach((dateKey) => {
      let status = dayWise[dateKey].status;
      
      if (status === 'Leave') {
        if (currentQuarterLeaves < 3) {
          currentQuarterLeaves++;
          status = 'Paid Leave';
        } else {
          status = 'Unpaid Leave';
        }
        dayWise[dateKey].status = status; // Overwrite raw 'Leave' with Paid/Unpaid
      }

      if (status === 'Full Day') presentCount++;
      else if (status === 'Present') presentCount++; // Present but <4.5h (we'll count as 1 to match existing behavior, HR can adjust)
      else if (status === 'Half Day') halfDayCount++;
      else if (status === 'Short Leave') halfDayCount++; 
      else if (status === 'Absent') absentCount++;
      else if (status === 'Paid Leave') paidLeaveCount++;
      else if (status === 'Unpaid Leave') unpaidLeaveCount++;
      else if (status === 'Weekly Off') weeklyOffCount++;
      else if (status === 'Sandwich Leave') sandwichLeaveCount++;
    });

    // Payable Days = Working Days + Valid Weekly Offs + Paid Leaves + 0.5 * Half/Short Leaves
    // Absents, Unpaid Leaves, and Sandwich Leaves result in deductions.
    const payableDays = presentCount + weeklyOffCount + paidLeaveCount + (0.5 * halfDayCount);

    return {
      employee: emp,
      dayWise,
      summary: {
        present: presentCount,
        halfDay: halfDayCount,
        absent: absentCount,
        paidLeave: paidLeaveCount,
        unpaidLeave: unpaidLeaveCount,
        weeklyOff: weeklyOffCount,
        sandwichLeave: sandwichLeaveCount,
        payableDays,
      },
    };
  });

  return {
    monthKey,
    datesList,
    employees: employeeData,
  };
};

// Generate mock data when offline or Supabase is unconfigured
const generateMockHrmsData = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = getDaysInMonth(year, month);
  const datesList = getMonthDatesList(monthKey);

  const employees = filterHrmsAttendanceEmployees(MOCK_EMPLOYEES).map(emp => {
    const dayWise = {};
    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let weeklyOffCount = 0;

    const todayKey = getLocalDateKey();

    datesList.forEach((dateKey, index) => {
      const day = index + 1;
      const isWeeklyOff = isWeeklyOffDate(year, month, day);
      const isFuture = dateKey > todayKey;
      const isBeforeStart = dateKey < '2026-06-24';
      
      let status = 'Absent';
      let hoursWorked = 0;

      if (isBeforeStart) {
        status = 'No Record';
      } else if (isFuture) {
        status = 'Future';
      } else if (dateKey === todayKey) {
        // Mocking today: suppose everyone clocked in/present today for testing
        status = 'Present';
        hoursWorked = 8.6;
      } else if (isWeeklyOff) {
        status = 'Weekly Off';
      } else {
        // Mock logic to distribute status with corrected thresholds
        const rand = Math.random();
        if (rand > 0.3) {
          status = 'Present';
          hoursWorked = 8.5 + Math.random() * 1.0; // 8.5h-9.5h
        } else if (rand > 0.2) {
          status = 'Short Leave';
          hoursWorked = 7.0 + Math.random() * 1.4; // 7h-8.4h
        } else if (rand > 0.1) {
          status = 'Half Day';
          hoursWorked = 4.5 + Math.random() * 2.4; // 4.5h-6.9h
        } else if (rand > 0.05) {
          status = 'Leave';
          hoursWorked = 0;
        } else {
          status = 'Absent';
          hoursWorked = 0;
        }
      }

      if (status === 'Present') presentCount++;
      else if (status === 'Half Day') halfDayCount++;
      else if (status === 'Short Leave') halfDayCount++; // counts as 0.5 day
      else if (status === 'Absent') absentCount++;
      else if (status === 'Leave') leaveCount++;
      else if (status === 'Weekly Off') weeklyOffCount++;

      let clockIn = null;
      let clockOut = null;
      let totalMins = 0;
      let lunchMins = 0;

      if (status === 'Present') {
        clockIn = `${dateKey}T04:00:00.000Z`; // 9:30 AM IST (UTC+5:30)
        clockOut = `${dateKey}T13:00:00.000Z`; // 6:30 PM IST
        totalMins = Math.round((new Date(clockOut) - new Date(clockIn)) / 60000);
        lunchMins = Math.max(0, totalMins - Math.round(hoursWorked * 60));
      } else if (status === 'Short Leave') {
        clockIn = `${dateKey}T04:00:00.000Z`; // 9:30 AM IST
        clockOut = `${dateKey}T11:30:00.000Z`; // 5:00 PM IST
        totalMins = Math.round((new Date(clockOut) - new Date(clockIn)) / 60000);
        lunchMins = Math.max(0, totalMins - Math.round(hoursWorked * 60));
      } else if (status === 'Half Day') {
        clockIn = `${dateKey}T04:30:00.000Z`; // 10:00 AM IST
        clockOut = `${dateKey}T08:45:00.000Z`; // 2:15 PM IST
        totalMins = Math.round((new Date(clockOut) - new Date(clockIn)) / 60000);
        lunchMins = Math.max(0, totalMins - Math.round(hoursWorked * 60));
      }

      dayWise[dateKey] = {
        status,
        hours: hoursWorked,
        clockIn,
        clockOut,
        totalMins,
        lunchMins,
      };
    });

    const payableDays = presentCount + (0.5 * halfDayCount) + leaveCount;

    return {
      employee: emp,
      dayWise,
      summary: {
        present: presentCount,
        halfDay: halfDayCount,
        absent: absentCount,
        leave: leaveCount,
        weeklyOff: weeklyOffCount,
        payableDays,
      },
    };
  });

  return {
    monthKey,
    datesList,
    employees,
  };
};

// Fetch personal attendance data for Employee view
export const fetchEmployeeHrmsData = async (employeeId, monthKey) => {
  if (!isSupabaseConfigured || !employeeId) {
    const mockAll = generateMockHrmsData(monthKey);
    const mockSelf = mockAll.employees.find(e => e.employee.id === employeeId) || mockAll.employees[0];
    return {
      monthKey,
      datesList: mockAll.datesList,
      ...mockSelf,
    };
  }

  try {
    const supabase = getSupabase();
    const [year, month] = monthKey.split('-').map(Number);
    const lastDay = getDaysInMonth(year, month);
    
    const startOfMonth = `${monthKey}-01T00:00:00.000Z`;
    const endOfMonth = `${monthKey}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    // Fetch employee profile (resilient to missing salary column)
    let profile = null;
    const { data: profileWithSalary, error: profileError } = await supabase
      .from(EMPLOYEE_PROFILES_TABLE)
      .select('id, name, role, dept, salary')
      .eq('id', employeeId)
      .single();

    if (profileError) {
      console.warn('Failed to fetch salary column for profile, fetching without it:', profileError.message);
      const { data: profileNoSalary, error: fallbackProfileError } = await supabase
        .from(EMPLOYEE_PROFILES_TABLE)
        .select('id, name, role, dept')
        .eq('id', employeeId)
        .single();

      if (fallbackProfileError) throw fallbackProfileError;
      profile = {
        ...profileNoSalary,
        base_salary: 0,
      };
    } else {
      profile = {
        ...profileWithSalary,
        base_salary: profileWithSalary?.salary || 0,
      };
    }

    // Fetch clock sessions (with id and clock_out for segment computation)
    const { data: clockSessions, error: clockError } = await supabase
      .from(CLOCK_SESSIONS_TABLE)
      .select('id, employee_id, clock_in, clock_out, hours')
      .eq('employee_id', employeeId)
      .gte('clock_in', startOfMonth)
      .lte('clock_in', endOfMonth);

    if (clockError) throw clockError;

    // Fetch segments for this employee's sessions
    let clockSegments = [];
    if (clockSessions && clockSessions.length > 0) {
      const sessionIds = clockSessions.map(s => s.id);
      const { data: segsData, error: segErr } = await supabase
        .from(CLOCK_SESSION_SEGMENTS_TABLE)
        .select('session_id, kind, label, started_at, ended_at')
        .in('session_id', sessionIds)
        .order('started_at', { ascending: true });

      if (!segErr) {
        clockSegments = segsData || [];
      }
    }

    // Fetch leaves for the quarter
    const quarter = Math.ceil(month / 3);
    const quarterStartMonth = (quarter - 1) * 3 + 1;
    const quarterStart = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01T00:00:00.000Z`;

    const { data: approvedLeaves, error: leaveError } = await supabase
      .from(LEAVE_REQUESTS_TABLE)
      .select('employee_id, start_date, end_date, leave_type')
      .eq('employee_id', employeeId)
      .eq('status', 'Approved')
      .lte('start_date', endOfMonth)
      .gte('end_date', quarterStart);

    if (leaveError) throw leaveError;

    const res = processHrmsAggregation(monthKey, [profile], clockSessions || [], approvedLeaves || [], clockSegments);
    return {
      monthKey,
      datesList: res.datesList,
      ...res.employees[0],
    };
  } catch (error) {
    console.error('Error fetching employee HRMS data:', error);
    // Fallback
    const mockAll = generateMockHrmsData(monthKey);
    return {
      monthKey,
      datesList: mockAll.datesList,
      ...mockAll.employees[0],
    };
  }
};

// Convert monthly HRMS aggregation data into CSV string format
export const convertHrmsDataToCsv = (datesList, employees) => {
  const headers = [
    'Employee Name',
    'Designation',
    'Department',
    ...datesList.map(dateKey => dateKey.split('-')[2]),
  ];

  const rows = employees.map(emp => {
    return [
      emp.employee.name,
      emp.employee.role,
      normalizeDepartmentName(emp.employee.dept),
      ...datesList.map(dateKey => getHrmsStatusDisplay(emp.dayWise[dateKey]?.status).letter),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
};

// Central salary projection calculator (can be easily customized with Aarti ma'am's formula)
export const calculateSalaryProjection = (baseSalary, summary, totalMonthDays) => {
  // 1. Calculate Daily Rate (default is base salary divided by total calendar days)
  const dailyRate = Number(baseSalary || 0) / Number(totalMonthDays || 30);

  // 2. Prefer the HRMS aggregation result so payroll, sandwich leave, and quarter leave quota stay aligned.
  const payableDays = Number.isFinite(Number(summary?.payableDays))
    ? Number(summary.payableDays)
    : (Number(summary?.present || 0) + (0.5 * Number(summary?.halfDay || 0)) + Number(summary?.leave || 0));

  // 3. Gross Earnings
  const grossEarnings = Math.round(dailyRate * payableDays);

  // 4. Deductions placeholder (Professional Tax, late coming penalties, etc.)
  const deductions = 0;

  // 5. Net Payable
  const netPayable = Math.max(0, grossEarnings - deductions);

  return {
    dailyRate: Math.round(dailyRate),
    payableDays,
    grossEarnings,
    deductions,
    netPayable,
  };
};

// Normalize department names to group typo variations under single standardized labels
export const normalizeDepartmentName = (dept) => {
  if (!dept) return 'General';
  const normalized = dept.trim().toLowerCase();

  if (normalized.includes('develop')) {
    return 'Development';
  }
  if (normalized.includes('marketing') || normalized.includes('market') || normalized.includes('digit')) {
    return 'Digital Marketing';
  }
  if (normalized.includes('design') || normalized.includes('ui') || normalized.includes('ux')) {
    return 'Design';
  }
  if (normalized.includes('campus') || normalized.includes('campush')) {
    return 'B2B Campus Team';
  }
  if (
    normalized === 'csr' ||
    normalized.includes('customer support') ||
    normalized.includes('client support') ||
    normalized.includes('customer service') ||
    normalized.includes('customer care')
  ) {
    return 'Customer Support';
  }
  if (normalized.includes('management') || normalized.includes('admin') || normalized.includes('ceo') || normalized.includes('exec')) {
    return 'Management';
  }

  // Capitalize first letter of raw string as fallback
  return dept.charAt(0).toUpperCase() + dept.slice(1);
};



