import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { Calendar } from 'react-native-calendars';
import CommonButton from '../../components/CommonButton';
import DropdownSelect from '../../components/DropdownSelect';
import AppHeader from '../../components/AppHeader';
import AiAssistant from '../../components/AiAssistant';
import {
  darkBackgroundColor,
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import { useAuth } from '../../context/AuthContext';
import { createRealtimeChannelName, getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { fetchAllEmployeeProfiles } from '../../services/employeeService';
import { subscribeToUserNotifications } from '../../services/notificationService';
import {
  getLoginCategoryForProfileRole,
  EMPLOYEE_ROLE_ID,
  isReviewerUser,
  isCeoAdminUser,
  isHrManagerUser,
} from '../../constants/roles';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const CARD_RADIUS = wp(4);

const LEAVE_TYPES = [
  'Sick Leave',
  'Casual Leave',
  'Annual Leave',
  'Work From Home (WFH)',
  'Half Day',
  'Short Leave',
  'Urgent Leave',
];

const STATUS_FILTER_OPTIONS = ['All', 'Pending', 'Approved', 'Rejected'];

const HALF_DAY_TYPES = ['First Half', 'Second Half'];

const isRangeType = (type) => {
  return [
    'Sick Leave',
    'Casual Leave',
    'Annual Leave',
    'Work From Home (WFH)',
    'Urgent Leave',
  ].includes(type);
};

const calculateDays = (start, end) => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate - startDate;
  if (diffTime < 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const formatDateDisplay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const MOCK_LEAVES = [
  {
    id: 'mock-1',
    leave_type: 'Sick Leave',
    start_date: '2026-06-25',
    end_date: '2026-06-27',
    days: 3,
    reason: 'Fever and cold',
    status: 'Pending',
    reporting_officer: 'CEO Admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    leave_type: 'Short Leave',
    start_date: '2026-06-24',
    end_date: '2026-06-24',
    days: 0.25,
    start_time: '05:00 PM',
    end_time: '07:00 PM',
    reason: 'Personal work',
    status: 'Approved',
    reporting_officer: 'CEO Admin',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  }
];

const MOCK_TEAM_LEAVES = [
  {
    id: 'mock-team-1',
    employee_id: 'mock-emp-1',
    employee_name: 'Shubham Kumar',
    leave_type: 'Sick Leave',
    start_date: '2026-06-26',
    end_date: '2026-06-26',
    days: 1,
    reason: 'Suffering from cold and cough',
    status: 'Pending',
    reporting_officer: 'CEO Admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-team-2',
    employee_id: 'mock-emp-2',
    employee_name: 'Ankit Verma',
    leave_type: 'Casual Leave',
    start_date: '2026-06-27',
    end_date: '2026-06-28',
    days: 2,
    reason: 'Urgent family function',
    status: 'Approved',
    reporting_officer: 'CEO Admin',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  }
];


/* CUSTOM ANALOG CLOCK PICKER MODAL */
const AnalogClockPickerModal = ({
  visible,
  onClose,
  onConfirm,
  initialTime,
}) => {
  const [activeMode, setActiveMode] = useState('hour'); // 'hour' or 'minute'
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmpm, setSelectedAmpm] = useState('AM');

  useEffect(() => {
    if (visible && initialTime) {
      const match = initialTime.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
      if (match) {
        setSelectedHour(parseInt(match[1], 10));
        setSelectedMinute(parseInt(match[2], 10));
        setSelectedAmpm(match[3].toUpperCase());
      }
      setActiveMode('hour');
    }
  }, [visible, initialTime]);

  const handleConfirm = () => {
    const formattedHour = String(selectedHour).padStart(2, '0');
    const formattedMinute = String(selectedMinute).padStart(2, '0');
    onConfirm(`${formattedHour}:${formattedMinute} ${selectedAmpm}`);
    onClose();
  };

  const handleHourSelect = (h) => {
    setSelectedHour(h);
    setTimeout(() => {
      setActiveMode('minute');
    }, 250);
  };

  const handleMinuteSelect = (m) => {
    setSelectedMinute(m);
  };

  // Dial calculations
  const DIAL_SIZE = wp(60);
  const CENTER = DIAL_SIZE / 2;
  const RADIUS = DIAL_SIZE / 2 - wp(6.5);
  const ITEM_SIZE = wp(8);

  const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handAngle = activeMode === 'hour' ? selectedHour * 30 : selectedMinute * 6;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.clockOverlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.clockCard} onPress={() => {}}>
          
          <Text style={styles.clockModalTitle}>Select Time</Text>

          {/* Time display box */}
          <View style={styles.timeDisplayRow}>
            <TouchableOpacity
              onPress={() => setActiveMode('hour')}
              style={[styles.timeDisplayBox, activeMode === 'hour' && styles.timeDisplayBoxActive]}>
              <Text style={[styles.timeDisplayText, activeMode === 'hour' && styles.timeDisplayActiveText]}>
                {String(selectedHour).padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.timeColon}>:</Text>

            <TouchableOpacity
              onPress={() => setActiveMode('minute')}
              style={[styles.timeDisplayBox, activeMode === 'minute' && styles.timeDisplayBoxActive]}>
              <Text style={[styles.timeDisplayText, activeMode === 'minute' && styles.timeDisplayActiveText]}>
                {String(selectedMinute).padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            <View style={styles.ampmDisplayColumn}>
              <TouchableOpacity
                onPress={() => setSelectedAmpm('AM')}
                style={[styles.ampmMiniBtn, selectedAmpm === 'AM' && styles.ampmMiniBtnActive]}>
                <Text style={[styles.ampmMiniBtnText, selectedAmpm === 'AM' && styles.ampmMiniBtnActiveText]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedAmpm('PM')}
                style={[styles.ampmMiniBtn, selectedAmpm === 'PM' && styles.ampmMiniBtnActive]}>
                <Text style={[styles.ampmMiniBtnText, selectedAmpm === 'PM' && styles.ampmMiniBtnActiveText]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clock face dial */}
          <View style={[styles.clockDial, { width: DIAL_SIZE, height: DIAL_SIZE, borderRadius: DIAL_SIZE / 2 }]}>
            
            {/* Clock hand pointer */}
            <View style={[
              styles.clockHandContainer,
              {
                top: CENTER - RADIUS,
                left: CENTER - 1,
                height: RADIUS * 2,
                transform: [{ rotate: `${handAngle}deg` }]
              }
            ]}>
              <View style={[styles.clockHandLine, { height: RADIUS }]} />
              <View style={styles.clockHandCap} />
            </View>
            <View style={styles.clockCenterDot} />

            {/* Dial Items */}
            {activeMode === 'hour' ? (
              HOURS.map((h, i) => {
                const angleRad = (i * 30 - 90) * (Math.PI / 180);
                const x = CENTER + RADIUS * Math.cos(angleRad) - ITEM_SIZE / 2;
                const y = CENTER + RADIUS * Math.sin(angleRad) - ITEM_SIZE / 2;
                const isSelected = selectedHour === h;

                return (
                  <TouchableOpacity
                    key={h}
                    onPress={() => handleHourSelect(h)}
                    style={[
                      styles.clockNumberCell,
                      { left: x, top: y, width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2 },
                      isSelected && styles.clockNumberCellActive
                    ]}>
                    <Text style={[styles.clockNumberText, isSelected && styles.clockNumberActiveText]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              MINUTES.map((m, i) => {
                const angleRad = (i * 30 - 90) * (Math.PI / 180);
                const x = CENTER + RADIUS * Math.cos(angleRad) - ITEM_SIZE / 2;
                const y = CENTER + RADIUS * Math.sin(angleRad) - ITEM_SIZE / 2;
                const isSelected = selectedMinute === m;

                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handleMinuteSelect(m)}
                    style={[
                      styles.clockNumberCell,
                      { left: x, top: y, width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2 },
                      isSelected && styles.clockNumberCellActive
                    ]}>
                    <Text style={[styles.clockNumberText, isSelected && styles.clockNumberActiveText]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Dialog actions */}
          <View style={styles.clockActions}>
            <CommonButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.clockCancelBtn}
            />
            <CommonButton
              title="Set Time"
              onPress={handleConfirm}
              style={styles.clockSetBtn}
              textStyle={styles.submitBtnText}
            />
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const ApplyLeaveScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const userId = user?.id;
  const userName = user?.name;
  const isCeo = isCeoAdminUser(user);
  const isReviewer = isReviewerUser(user);
  const isHr = isHrManagerUser(user);

  // Navigation View State ('list' shows applied leaves, 'form' shows apply form)
  const [currentView, setCurrentView] = useState('list');
  const [leaves, setLeaves] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState(isCeo ? 'approvals' : 'my_leaves');
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Filter State
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  const filteredLeaves = useMemo(() => {
    const listToFilter = activeTab === 'my_leaves' ? leaves : teamLeaves;
    return listToFilter.filter(item => {
      const itemStatusLower = String(item.status || '').toLowerCase();
      if (selectedStatusFilter === 'All') {
        return true;
      } else if (selectedStatusFilter === 'Pending') {
        return itemStatusLower === 'pending';
      } else if (selectedStatusFilter === 'Approved') {
        return itemStatusLower.startsWith('app');
      } else if (selectedStatusFilter === 'Rejected') {
        return itemStatusLower.startsWith('rej');
      }
      return true;
    });
  }, [leaves, teamLeaves, activeTab, selectedStatusFilter]);

  // Form Fields
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [singleDate, setSingleDate] = useState('');
  const [halfDayType, setHalfDayType] = useState('First Half');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [reportingTo, setReportingTo] = useState('');
  const [reason, setReason] = useState('');

  // Dropdown list options
  const [reportingOfficers, setReportingOfficers] = useState([]);
  const [officersData, setOfficersData] = useState([]);

  // Modals visibility
  const [calendarMode, setCalendarMode] = useState('single'); // 'single' or 'range'
  const [calendarTarget, setCalendarTarget] = useState(''); // 'start', 'end', 'single'
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [clockPickerVisible, setClockPickerVisible] = useState(false);
  const [clockPickerTarget, setClockPickerTarget] = useState('start'); // 'start' or 'end'

  // Submit and errors state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const loadUserLeaves = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingLeaves(true);
    }
    try {
      if (isSupabaseConfigured && userId) {
        // Fetch user's own leaves
        const { data, error } = await getSupabase()
          .from('leave_requests')
          .select('*')
          .eq('employee_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setLeaves(data || []);

        // Fetch team leaves (approvals) if reviewer
        if (isReviewer && userName) {
          const { data: teamData, error: teamError } = await getSupabase()
            .from('leave_requests')
            .select('*')
            .ilike('reporting_officer', userName)
            .order('created_at', { ascending: false });
          if (teamError) throw teamError;
          setTeamLeaves(teamData || []);
        }
      } else {
        setLeaves(MOCK_LEAVES);
        setTeamLeaves(MOCK_TEAM_LEAVES);
      }
    } catch (err) {
      console.error('Error loading leaves:', err);
      setLeaves(MOCK_LEAVES);
      setTeamLeaves(MOCK_TEAM_LEAVES);
    } finally {
      if (!silent) {
        setLoadingLeaves(false);
      }
    }
  }, [userId, userName, isReviewer]);

  useEffect(() => {
    if (!userId) return () => {};

    loadUserLeaves();

    if (!isSupabaseConfigured) {
      return () => {};
    }

    const supabase = getSupabase();
    const channelName = createRealtimeChannelName(`leaves-${userId}`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
        },
        (payload) => {
          const oldEmpId = payload.old?.employee_id;
          const newEmpId = payload.new?.employee_id;
          const oldOfficer = payload.old?.reporting_officer;
          const newOfficer = payload.new?.reporting_officer;

          const isUserOfficer = (officerName) => {
            if (!officerName || !userName) return false;
            return officerName.toLowerCase().trim() === userName.toLowerCase().trim();
          };

          if (
            (!oldEmpId && !newEmpId) ||
            oldEmpId === userId ||
            newEmpId === userId ||
            isUserOfficer(oldOfficer) ||
            isUserOfficer(newOfficer)
          ) {
            loadUserLeaves(true);
          }
        }
      )
      .subscribe();

    const unsubscribeNotifications = subscribeToUserNotifications(userId, () => {
      loadUserLeaves(true);
    });

    return () => {
      supabase.removeChannel(channel);
      unsubscribeNotifications();
    };
  }, [userId, userName, loadUserLeaves]);

  const handleUpdateLeaveStatus = async (leaveId, newStatus) => {
    setUpdatingStatus(true);
    try {
      if (isSupabaseConfigured) {
        // 1. Update the status in leave_requests
        const { error } = await getSupabase()
          .from('leave_requests')
          .update({ status: newStatus })
          .eq('id', leaveId);
        
        if (error) throw error;

        // 2. Fetch the leave details to get the applicant's employee_id
        const leaveToUpdate = teamLeaves.find(l => l.id === leaveId) || leaves.find(l => l.id === leaveId);
        const applicantId = leaveToUpdate ? leaveToUpdate.employee_id : null;
        const leaveTypeVal = leaveToUpdate ? leaveToUpdate.leave_type : 'Leave';

        // 3. Send a notification to the applicant
        if (applicantId) {
          const notifMessage = `Your request for ${leaveTypeVal} has been ${newStatus.toLowerCase()} by ${user?.name || 'your reporting officer'}.`;
          
          const { error: notifErr } = await getSupabase()
            .from('notifications')
            .insert({
              recipient_id: applicantId,
              sender_id: user?.id || 'unknown',
              title: `Leave Request ${newStatus}`,
              message: notifMessage,
              type: 'leave_status',
              reference_id: leaveId,
              is_read: false,
            });
            
          if (notifErr && __DEV__) {
            console.warn('Failed to insert leave status notification:', notifErr);
          }
        }
      } else {
        // Local state fallback for mock testing
        setTeamLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: newStatus } : l));
        setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: newStatus } : l));
      }

      // Close the detail modal
      setDetailModalVisible(false);
      
      // Reload lists
      loadUserLeaves(true);
    } catch (e) {
      console.error('Error updating leave status:', e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const loadOfficers = useCallback(async () => {
    try {
      const employees = await fetchAllEmployeeProfiles();
      
      const managers = employees.filter(emp => {
        const appRole = String(emp.app_role || '').trim().toLowerCase();
        const category = getLoginCategoryForProfileRole(emp.role);
        
        return (
          appRole !== EMPLOYEE_ROLE_ID &&
          category !== EMPLOYEE_ROLE_ID &&
          emp.id !== userId
        );
      });

      setOfficersData(managers);
      const names = managers.map(emp => emp.name);
      setReportingOfficers(names.length > 0 ? names : ['Aryn Rosshan (Sam)', 'Rakesh Roshan ', 'ArshPreet','Vineet']);
      
      setReportingTo(prev => {
        if (names.includes(prev)) {
          return prev;
        }
        return names.length > 0 ? names[0] : 'Saurabh Bhatia';
      });
    } catch (e) {
      setReportingOfficers(['Aryn Rosshan (Sam)', 'Rakesh Roshan ', 'ArshPreet','Vineet']);
      setReportingTo(prev => prev || 'Saurabh Bhatia');
    }
  }, [userId]);

  useEffect(() => {
    loadOfficers();

    if (!isSupabaseConfigured) {
      return () => {};
    }

    const supabase = getSupabase();
    const channelName = createRealtimeChannelName('officers-realtime');
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_profiles',
        },
        () => {
          loadOfficers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOfficers]);

  const calculatedDaysCount = useMemo(() => {
    if (isRangeType(leaveType)) {
      return calculateDays(startDate, endDate);
    }
    return 0;
  }, [leaveType, startDate, endDate]);

  const openCalendar = (mode, target) => {
    setCalendarMode(mode);
    setCalendarTarget(target);
    setCalendarVisible(true);
  };

  const openClockPicker = (target) => {
    setClockPickerTarget(target);
    setClockPickerVisible(true);
  };

  const handleTimeConfirm = (timeStr) => {
    if (clockPickerTarget === 'start') {
      setStartTime(timeStr);
      setErrors(prev => ({ ...prev, endTime: null }));
    } else {
      setEndTime(timeStr);
      setErrors(prev => ({ ...prev, endTime: null }));
    }
  };

  const handleDateSelect = (dateKey) => {
    if (calendarTarget === 'single') {
      setSingleDate(dateKey);
      setErrors(prev => ({ ...prev, singleDate: null }));
    } else if (calendarTarget === 'start') {
      setStartDate(dateKey);
      setErrors(prev => ({ ...prev, startDate: null }));
      if (endDate && dateKey > endDate) {
        setEndDate('');
      }
    } else if (calendarTarget === 'end') {
      if (startDate && dateKey < startDate) {
        setEndDate(startDate);
        setStartDate(dateKey);
      } else {
        setEndDate(dateKey);
      }
      setErrors(prev => ({ ...prev, endDate: null }));
    }
    setCalendarVisible(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (isRangeType(leaveType)) {
      if (!startDate) newErrors.startDate = 'Start date is required';
      if (!endDate) newErrors.endDate = 'End date is required';
      if (startDate && endDate && startDate > endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    } else if (leaveType === 'Half Day') {
      if (!singleDate) newErrors.singleDate = 'Date is required';
    } else if (leaveType === 'Short Leave') {
      if (!singleDate) newErrors.singleDate = 'Date is required';
      
      const matchStart = startTime.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
      const matchEnd = endTime.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
      if (matchStart && matchEnd) {
        let startH = parseInt(matchStart[1], 10);
        const startM = parseInt(matchStart[2], 10);
        const startAp = matchStart[3].toUpperCase();
        let endH = parseInt(matchEnd[1], 10);
        const endM = parseInt(matchEnd[2], 10);
        const endAp = matchEnd[3].toUpperCase();

        if (startAp === 'PM' && startH !== 12) startH += 12;
        if (startAp === 'AM' && startH === 12) startH = 0;
        if (endAp === 'PM' && endH !== 12) endH += 12;
        if (endAp === 'AM' && endH === 12) endH = 0;

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (startMinutes >= endMinutes) {
          newErrors.endTime = 'End time must be after start time';
        }
      }
    }

    if (!reason.trim()) {
      newErrors.reason = 'Reason for leave is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const startDateVal = isRangeType(leaveType) ? startDate : singleDate;
      const endDateVal = isRangeType(leaveType) ? endDate : singleDate;
      const daysVal = isRangeType(leaveType) ? calculatedDaysCount : 1;

      const payload = {
        employee_id: user?.id || 'unknown_employee',
        employee_name: user?.name || 'Unknown',
        leave_type: leaveType,
        start_date: startDateVal,
        end_date: endDateVal,
        days: daysVal,
        reason: reason,
        status: 'Pending',
        reporting_to: reportingTo,
        reporting_officer: reportingTo,
      };

      if (leaveType === 'Short Leave') {
        payload.start_time = startTime;
        payload.end_time = endTime;
      } else if (leaveType === 'Half Day') {
        payload.half_day_type = halfDayType === 'First Half' ? 'first_half' : 'second_half';
      }

      if (isSupabaseConfigured) {
        const { data: insertedData, error } = await getSupabase()
          .from('leave_requests')
          .insert(payload)
          .select('id')
          .single();

        if (error) {
          throw new Error(error.message || 'Database insert failed');
        }

        // Notification insertion
        const matchedOfficer = officersData.find(o => o.name === reportingTo);
        const recipientId = matchedOfficer ? matchedOfficer.id : null;
        if (recipientId) {
          let notifMessage = '';
          if (leaveType === 'Short Leave') {
            notifMessage = `${user?.name || 'An employee'} has applied for Short Leave on ${formatDateDisplay(startDateVal)} from ${startTime} to ${endTime}.`;
          } else if (leaveType === 'Half Day') {
            const halfText = halfDayType === 'First Half' ? 'First Half' : 'Second Half';
            notifMessage = `${user?.name || 'An employee'} has applied for Half Day (${halfText}) Leave on ${formatDateDisplay(startDateVal)}.`;
          } else {
            notifMessage = `${user?.name || 'An employee'} has applied for ${leaveType} from ${formatDateDisplay(startDateVal)} to ${formatDateDisplay(endDateVal)} (${daysVal} day${daysVal > 1 ? 's' : ''}).`;
          }

          const { error: notifErr } = await getSupabase()
            .from('notifications')
            .insert({
              recipient_id: recipientId,
              sender_id: user?.id || 'unknown',
              title: 'New Leave Request',
              message: notifMessage,
              type: 'leave_request',
              reference_id: insertedData?.id || payload.employee_id,
              is_read: false,
            });

          if (notifErr && __DEV__) {
            console.warn('Failed to insert leave notification:', notifErr.message || notifErr);
          }
        }
      } else {
        console.warn('Supabase not configured, mock success shown');
        // Add to local mock list so they see it in the UI!
        const newMockLeave = {
          id: `mock-${Date.now()}`,
          leave_type: leaveType,
          start_date: startDateVal,
          end_date: endDateVal,
          days: daysVal,
          start_time: startTime,
          end_time: endTime,
          half_day_type: halfDayType === 'First Half' ? 'first_half' : 'second_half',
          reason: reason,
          status: 'Pending',
          reporting_officer: reportingTo,
          created_at: new Date().toISOString(),
        };
        MOCK_LEAVES.unshift(newMockLeave);
      }

      setSuccessModalVisible(true);
    } catch (e) {
      console.error(e);
      setErrors(prev => ({ ...prev, submit: e.message || 'Failed to submit leave request' }));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setSingleDate('');
    setReason('');
    setErrors({});
    setSuccessModalVisible(false);
    setSelectedStatusFilter('All');
    setCurrentView('list');
    loadUserLeaves();
  };

  const handleBack = () => {
    if (currentView === 'form') {
      setCurrentView('list');
      setErrors({});
    } else {
      navigation.goBack();
    }
  };

  const markedDates = useMemo(() => {
    const themeColor = PURPLE;
    if (calendarMode === 'single') {
      const activeDate = calendarTarget === 'single' ? singleDate : calendarTarget === 'start' ? startDate : endDate;
      return activeDate ? {
        [activeDate]: {
          selected: true,
          selectedColor: themeColor,
          selectedTextColor: '#ffffff'
        }
      } : {};
    }

    if (!startDate) return {};
    if (!endDate || startDate === endDate) {
      return {
        [startDate]: {
          startingDay: true,
          endingDay: true,
          color: themeColor,
          textColor: '#ffffff'
        }
      };
    }

    const marked = {};
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const cursor = new Date(start);

    while (cursor <= end) {
      const dateKey = cursor.toISOString().split('T')[0];
      const isStart = dateKey === startDate;
      const isEnd = dateKey === endDate;
      marked[dateKey] = {
        startingDay: isStart,
        endingDay: isEnd,
        color: themeColor,
        textColor: '#ffffff'
      };
      cursor.setDate(cursor.getDate() + 1);
    }
    return marked;
  }, [calendarMode, calendarTarget, singleDate, startDate, endDate]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const minDate = useMemo(() => {
    if (calendarTarget === 'end') {
      return startDate || todayStr;
    }
    return todayStr;
  }, [calendarTarget, startDate, todayStr]);

  const calendarTheme = {
    backgroundColor: darkSurfaceColor,
    calendarBackground: darkSurfaceColor,
    textSectionTitleColor: darkTextSecondaryColor,
    selectedDayBackgroundColor: PURPLE,
    selectedDayTextColor: '#ffffff',
    todayTextColor: PURPLE,
    dayTextColor: darkTextPrimaryColor,
    textDisabledColor: 'rgba(255,255,255,0.15)',
    monthTextColor: darkTextPrimaryColor,
    arrowColor: PURPLE,
    textDayFontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    textMonthFontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    textDayHeaderFontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        {currentView === 'list' ? (
          <AppHeader title="Leave Requests" />
        ) : (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="chevron-left" size={wp(6)} color={darkTextPrimaryColor} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Apply Leave</Text>
            <View style={styles.headerRightSpacer} />
          </View>
        )}

        {currentView === 'list' ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            
            {isReviewerUser(user) && !isCeo && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'my_leaves' && styles.tabButtonActive]}
                  onPress={() => {
                    setActiveTab('my_leaves');
                    setSelectedStatusFilter('All');
                  }}
                  activeOpacity={0.8}>
                  <Text style={[styles.tabButtonText, activeTab === 'my_leaves' && styles.tabButtonTextActive]}>
                    My Requests
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'approvals' && styles.tabButtonActive]}
                  onPress={() => {
                    setActiveTab('approvals');
                    setSelectedStatusFilter('All');
                  }}
                  activeOpacity={0.8}>
                  <Text style={[styles.tabButtonText, activeTab === 'approvals' && styles.tabButtonTextActive]}>
                    Approvals
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                {activeTab === 'my_leaves' ? 'My Requests' : 'Approvals'}
              </Text>
              {activeTab === 'my_leaves' && !loadingLeaves && leaves.length > 0 && (
                <TouchableOpacity
                  style={styles.applyNewBtn}
                  onPress={() => setCurrentView('form')}
                  activeOpacity={0.85}>
                  <Icon name="plus" size={wp(4)} color="#ffffff" />
                  <Text style={styles.applyNewBtnText}>Apply Leave</Text>
                </TouchableOpacity>
              )}
            </View>

            {!loadingLeaves && (activeTab === 'my_leaves' ? leaves : teamLeaves).length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
                style={styles.statusFilterContainer}>
                {STATUS_FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedStatusFilter === opt;
                  
                  let activeStyle = styles.filterChipActive; 
                  let activeTextStyle = styles.filterChipTextActive;
                  if (opt === 'Pending') {
                    activeStyle = styles.statusChipActivePending;
                  } else if (opt === 'Approved') {
                    activeStyle = styles.statusChipActiveApproved;
                  } else if (opt === 'Rejected') {
                    activeStyle = styles.statusChipActiveRejected;
                  }

                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.filterChip,
                        isSelected ? activeStyle : null
                      ]}
                      onPress={() => setSelectedStatusFilter(opt)}
                      activeOpacity={0.8}>
                      <Text style={[
                        styles.filterChipText,
                        isSelected ? activeTextStyle : null
                      ]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {loadingLeaves ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PURPLE} />
              </View>
            ) : (activeTab === 'my_leaves' ? leaves : teamLeaves).length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon 
                    name={activeTab === 'my_leaves' ? "file-text" : "check-square"} 
                    size={wp(14)} 
                    color="rgba(255,255,255,0.2)" 
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'my_leaves' ? 'No Leaves Found' : 'No Approvals Found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'my_leaves' 
                    ? 'You have not applied for any leaves yet.' 
                    : 'You do not have any leave requests assigned to you for review.'}
                </Text>
                {activeTab === 'my_leaves' && (
                  <CommonButton
                    title="Apply Leave"
                    onPress={() => setCurrentView('form')}
                    style={styles.emptyApplyBtn}
                    textStyle={styles.submitBtnText}
                  />
                )}
              </View>
            ) : filteredLeaves.length === 0 ? (
              <View style={styles.noFilterResultsContainer}>
                <Icon name="info" size={wp(10)} color={darkTextSecondaryColor} style={styles.noFilterResultsIcon} />
                <Text style={styles.noFilterResultsText}>
                  No {selectedStatusFilter === 'All' ? '' : `${selectedStatusFilter.toLowerCase()} `}leave requests found
                </Text>
              </View>
            ) : (
              filteredLeaves.map((item) => {
                const isApproved = String(item.status || '').toLowerCase().startsWith('app');
                const isRejected = String(item.status || '').toLowerCase().startsWith('rej');

                let statusStyle = styles.statusBadgePending;
                let statusTextStyle = styles.statusTextPending;
                if (isApproved) {
                  statusStyle = styles.statusBadgeApproved;
                  statusTextStyle = styles.statusTextApproved;
                } else if (isRejected) {
                  statusStyle = styles.statusBadgeRejected;
                  statusTextStyle = styles.statusTextRejected;
                }

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.leaveCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedLeave(item);
                      setDetailModalVisible(true);
                    }}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardLeaveType}>{item.leave_type}</Text>
                      <View style={[styles.statusBadge, statusStyle]}>
                        <Text style={[styles.statusText, statusTextStyle]}>
                          {item.status || 'Pending'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRow}>
                      <Icon name="calendar" size={wp(4)} color={darkTextSecondaryColor} />
                      <Text style={styles.cardText}>
                        {isRangeType(item.leave_type) ? (
                          <>
                            <Text style={styles.cardBoldText}>{formatDateDisplay(item.start_date)}</Text>
                            {' to '}
                            <Text style={styles.cardBoldText}>{formatDateDisplay(item.end_date)}</Text>
                          </>
                        ) : (
                          <Text style={styles.cardBoldText}>{formatDateDisplay(item.start_date)}</Text>
                        )}
                      </Text>
                    </View>

                    {item.leave_type === 'Short Leave' && item.start_time && (
                      <View style={styles.cardRow}>
                        <Icon name="clock" size={wp(4)} color={darkTextSecondaryColor} />
                        <Text style={styles.cardText}>
                          Time Slot: <Text style={styles.cardBoldText}>{item.start_time} - {item.end_time}</Text>
                        </Text>
                      </View>
                    )}

                    {item.leave_type === 'Half Day' && item.half_day_type && (
                      <View style={styles.cardRow}>
                        <Icon name="clock" size={wp(4)} color={darkTextSecondaryColor} />
                        <Text style={styles.cardText}>
                          Half: <Text style={styles.cardBoldText}>{item.half_day_type === 'first_half' ? 'First Half' : 'Second Half'}</Text>
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardRow}>
                      <Icon name="user" size={wp(4)} color={darkTextSecondaryColor} />
                      <Text style={styles.cardText}>
                        {activeTab === 'my_leaves' ? 'Reporting: ' : 'Applied By: '}
                        <Text style={styles.cardBoldText}>
                          {activeTab === 'my_leaves' 
                            ? (item.reporting_officer || 'CEO Admin') 
                            : (item.employee_name || 'Employee')}
                        </Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            <View style={styles.formCard}>
              
              <View style={styles.formHeaderRow}>
                <Icon name="edit-3" size={wp(5)} color={PURPLE} />
                <Text style={styles.formHeaderTitle}>Request Details</Text>
              </View>

              {/* Leave Type Dropdown */}
              <DropdownSelect
                label="Leave Category"
                value={leaveType}
                options={LEAVE_TYPES}
                onChange={(val) => {
                  setLeaveType(val);
                  setErrors({});
                }}
                required
                containerStyle={styles.dropdownField}
              />

              {/* DYNAMIC FIELD RENDERING */}
              
              {/* Range Leaves */}
              {isRangeType(leaveType) && (
                <View style={styles.dateFieldsContainer}>
                  <View style={styles.dateRow}>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.dateField, errors.startDate && styles.dateFieldInputError]}
                        onPress={() => openCalendar('single', 'start')}
                        activeOpacity={0.85}>
                        <Text style={styles.fieldLabel}>Start Date *</Text>
                        <View style={styles.dateValueContainer}>
                          <Text style={startDate ? styles.dateValueText : styles.datePlaceholderText}>
                            {startDate ? formatDateDisplay(startDate) : 'Select Start'}
                          </Text>
                          <Icon name="calendar" size={wp(4.5)} color={darkTextSecondaryColor} />
                        </View>
                      </TouchableOpacity>
                      {errors.startDate ? <Text style={styles.errorText}>{errors.startDate}</Text> : null}
                    </View>

                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.dateField, errors.endDate && styles.dateFieldInputError]}
                        onPress={() => openCalendar('single', 'end')}
                        activeOpacity={0.85}>
                        <Text style={styles.fieldLabel}>End Date *</Text>
                        <View style={styles.dateValueContainer}>
                          <Text style={endDate ? styles.dateValueText : styles.datePlaceholderText}>
                            {endDate ? formatDateDisplay(endDate) : 'Select End'}
                          </Text>
                          <Icon name="calendar" size={wp(4.5)} color={darkTextSecondaryColor} />
                        </View>
                      </TouchableOpacity>
                      {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}
                    </View>
                  </View>

                  {/* Display calculated duration */}
                  {calculatedDaysCount > 0 && (
                    <View style={styles.durationBanner}>
                      <Icon name="clock" size={wp(4.5)} color={PURPLE} />
                      <Text style={styles.durationText}>
                        Duration:{' '}
                        <Text style={styles.durationValueText}>
                          {calculatedDaysCount} {calculatedDaysCount === 1 ? 'Day' : 'Days'}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Half Day */}
              {leaveType === 'Half Day' && (
                <View style={styles.halfDayContainer}>
                  <View style={{ marginBottom: hp(2.4) }}>
                    <TouchableOpacity
                      style={[styles.singleDateField, errors.singleDate && styles.dateFieldInputError]}
                      onPress={() => openCalendar('single', 'single')}
                      activeOpacity={0.85}>
                      <Text style={styles.fieldLabel}>Date *</Text>
                      <View style={styles.dateValueContainer}>
                        <Text style={singleDate ? styles.dateValueText : styles.datePlaceholderText}>
                          {singleDate ? formatDateDisplay(singleDate) : 'Select Date'}
                        </Text>
                        <Icon name="calendar" size={wp(4.5)} color={darkTextSecondaryColor} />
                      </View>
                    </TouchableOpacity>
                    {errors.singleDate ? <Text style={styles.errorText}>{errors.singleDate}</Text> : null}
                  </View>

                  <DropdownSelect
                    label="Half Day Type"
                    value={halfDayType}
                    options={HALF_DAY_TYPES}
                    onChange={setHalfDayType}
                    required
                    containerStyle={styles.dropdownField}
                  />
                </View>
              )}

              {/* Short Leave */}
              {leaveType === 'Short Leave' && (
                <View style={styles.shortLeaveContainer}>
                  <View style={{ marginBottom: hp(2.4) }}>
                    <TouchableOpacity
                      style={[styles.singleDateField, errors.singleDate && styles.dateFieldInputError]}
                      onPress={() => openCalendar('single', 'single')}
                      activeOpacity={0.85}>
                      <Text style={styles.fieldLabel}>Date *</Text>
                      <View style={styles.dateValueContainer}>
                        <Text style={singleDate ? styles.dateValueText : styles.datePlaceholderText}>
                          {singleDate ? formatDateDisplay(singleDate) : 'Select Date'}
                        </Text>
                        <Icon name="calendar" size={wp(4.5)} color={darkTextSecondaryColor} />
                      </View>
                    </TouchableOpacity>
                    {errors.singleDate ? <Text style={styles.errorText}>{errors.singleDate}</Text> : null}
                  </View>

                  <View style={styles.dateRow}>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.dateField, styles.timePickerField]}
                        onPress={() => openClockPicker('start')}
                        activeOpacity={0.85}>
                        <Text style={styles.fieldLabel}>Start Time *</Text>
                        <View style={styles.dateValueContainer}>
                          <Text style={styles.dateValueText}>{startTime}</Text>
                          <Icon name="clock" size={wp(4.5)} color={darkTextSecondaryColor} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[
                          styles.dateField,
                          styles.timePickerField,
                          errors.endTime && styles.dateFieldInputError
                        ]}
                        onPress={() => openClockPicker('end')}
                        activeOpacity={0.85}>
                        <Text style={styles.fieldLabel}>End Time *</Text>
                        <View style={styles.dateValueContainer}>
                          <Text style={styles.dateValueText}>{endTime}</Text>
                          <Icon name="clock" size={wp(4.5)} color={darkTextSecondaryColor} />
                        </View>
                      </TouchableOpacity>
                      {errors.endTime ? <Text style={styles.errorText}>{errors.endTime}</Text> : null}
                    </View>
                  </View>
                </View>
              )}

              {/* Reporting To */}
              <DropdownSelect
                label="Reporting Officer"
                value={reportingTo}
                options={reportingOfficers}
                onChange={setReportingTo}
                required
                containerStyle={styles.dropdownField}
              />

              {/* Reason */}
              <View style={styles.reasonInputHeader}>
                <Text style={styles.reasonInputLabel}>Reason for Leave *</Text>
                <Text style={styles.charCounter}>{reason.length} chars</Text>
              </View>

              <View style={{ marginBottom: hp(2) }}>
                <View style={[
                  styles.reasonInputWrapper,
                  { marginBottom: 0 },
                  errors.reason && styles.reasonInputWrapperError
                ]}>
                  <TextInput
                    value={reason}
                    onChangeText={(text) => {
                      setReason(text);
                      setErrors(prev => ({ ...prev, reason: null }));
                    }}
                    placeholder="Explain the detailed reason for this leave request..."
                    placeholderTextColor={darkPlaceholderColor}
                    multiline
                    numberOfLines={5}
                    style={styles.reasonTextInput}
                  />
                </View>
                {errors.reason ? <Text style={styles.errorText}>{errors.reason}</Text> : null}
              </View>

              {/* Submit Error */}
              {errors.submit ? (
                <Text style={styles.submitErrorText}>{errors.submit}</Text>
              ) : null}

              {/* Submit Button */}
              <CommonButton
                title="Apply Leave"
                onPress={handleSubmit}
                loading={submitting}
                style={styles.submitBtn}
                textStyle={styles.submitBtnText}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* CALENDAR MODAL */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setCalendarVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {calendarTarget === 'single' ? 'Select Date' : calendarTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={wp(5)} color={darkTextSecondaryColor} />
              </TouchableOpacity>
            </View>

            <Calendar
              markingType="default"
              markedDates={markedDates}
              onDayPress={(day) => handleDateSelect(day.dateString)}
              minDate={minDate}
              enableSwipeMonths
              theme={calendarTheme}
              style={styles.calendar}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ANALOG CLOCK PICKER MODAL */}
      <AnalogClockPickerModal
        visible={clockPickerVisible}
        onClose={() => setClockPickerVisible(false)}
        onConfirm={handleTimeConfirm}
        initialTime={clockPickerTarget === 'start' ? startTime : endTime}
      />

      {/* SUCCESS CONFIRMATION MODAL */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={resetForm}>
        <View style={styles.successRoot}>
          <View style={styles.successBackdrop} />

          <View style={styles.successCard}>
            <View style={styles.successIconWrapper}>
              <Icon name="check-circle" size={wp(14)} color="#3DDC84" />
            </View>

            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successSubtitle}>
              Your leave request has been submitted to your reporting officer for review.
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Leave Category:</Text>
                <Text style={styles.summaryValue}>{leaveType}</Text>
              </View>
              
              {isRangeType(leaveType) && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>From Date:</Text>
                    <Text style={styles.summaryValue}>{formatDateDisplay(startDate)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>To Date:</Text>
                    <Text style={styles.summaryValue}>{formatDateDisplay(endDate)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration:</Text>
                    <Text style={styles.summaryValue}>{calculatedDaysCount} {calculatedDaysCount === 1 ? 'day' : 'days'}</Text>
                  </View>
                </>
              )}

              {leaveType === 'Half Day' && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date:</Text>
                    <Text style={styles.summaryValue}>{formatDateDisplay(singleDate)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Half Type:</Text>
                    <Text style={styles.summaryValue}>{halfDayType}</Text>
                  </View>
                </>
              )}

              {leaveType === 'Short Leave' && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date:</Text>
                    <Text style={styles.summaryValue}>{formatDateDisplay(singleDate)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Time Slot:</Text>
                    <Text style={styles.summaryValue}>{startTime} - {endTime}</Text>
                  </View>
                </>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Report To:</Text>
                <Text style={styles.summaryValue}>{reportingTo}</Text>
              </View>
            </View>

            <CommonButton
              title="Return to List"
              onPress={resetForm}
              style={styles.doneBtn}
              textStyle={styles.submitBtnText}
            />
          </View>
        </View>
      </Modal>

      {/* LEAVE DETAIL MODAL */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.detailOverlay}>
          {selectedLeave && (
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Leave Details</Text>
                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="x" size={wp(5.5)} color={darkTextSecondaryColor} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
                {/* Row 1: Applied By / Reporting Officer & Category */}
                <View style={styles.detailGridRow}>
                  {activeTab === 'approvals' ? (
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>Applied By</Text>
                      <Text style={styles.detailValue}>{selectedLeave.employee_name || 'Employee'}</Text>
                    </View>
                  ) : (
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>Reporting Officer</Text>
                      <Text style={styles.detailValue}>{selectedLeave.reporting_officer || 'CEO Admin'}</Text>
                    </View>
                  )}

                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{selectedLeave.leave_type}</Text>
                  </View>
                </View>

                {/* Row 2: Status & Duration */}
                <View style={styles.detailGridRow}>
                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={styles.detailStatusContainer}>
                      <View style={[
                        styles.statusBadge,
                        selectedLeave.status === 'Pending' ? styles.statusBadgePending :
                        String(selectedLeave.status || '').toLowerCase().startsWith('app') ? styles.statusBadgeApproved :
                        styles.statusBadgeRejected
                      ]}>
                        <Text style={[
                          styles.statusText,
                          selectedLeave.status === 'Pending' ? styles.statusTextPending :
                          String(selectedLeave.status || '').toLowerCase().startsWith('app') ? styles.statusTextApproved :
                          styles.statusTextRejected
                        ]}>
                          {selectedLeave.status || 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailGridCol}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>
                      {isRangeType(selectedLeave.leave_type) ? (
                        `${formatDateDisplay(selectedLeave.start_date)} - ${formatDateDisplay(selectedLeave.end_date)}`
                      ) : (
                        formatDateDisplay(selectedLeave.start_date)
                      )}
                    </Text>
                  </View>
                </View>

                {/* Row 3: Extra Info & Reporting Officer (if approvals) */}
                {(selectedLeave.days > 0 || selectedLeave.start_time || selectedLeave.half_day_type || activeTab === 'approvals') && (
                  <View style={styles.detailGridRow}>
                    <View style={styles.detailGridCol}>
                      {isRangeType(selectedLeave.leave_type) && selectedLeave.days > 0 ? (
                        <>
                          <Text style={styles.detailLabel}>Total Days</Text>
                          <Text style={styles.detailValue}>
                            {selectedLeave.days} {selectedLeave.days === 1 ? 'Day' : 'Days'}
                          </Text>
                        </>
                      ) : selectedLeave.leave_type === 'Short Leave' && selectedLeave.start_time ? (
                        <>
                          <Text style={styles.detailLabel}>Time Slot</Text>
                          <Text style={styles.detailValue}>
                            {selectedLeave.start_time} - {selectedLeave.end_time}
                          </Text>
                        </>
                      ) : selectedLeave.leave_type === 'Half Day' && selectedLeave.half_day_type ? (
                        <>
                          <Text style={styles.detailLabel}>Half Day Shift</Text>
                          <Text style={styles.detailValue}>
                            {selectedLeave.half_day_type === 'first_half' ? 'First Half' : 'Second Half'}
                          </Text>
                        </>
                      ) : (
                        <View />
                      )}
                    </View>

                    {activeTab === 'approvals' ? (
                      <View style={styles.detailGridCol}>
                        <Text style={styles.detailLabel}>Reporting Officer</Text>
                        <Text style={styles.detailValue}>{selectedLeave.reporting_officer || 'CEO Admin'}</Text>
                      </View>
                    ) : (
                      <View style={styles.detailGridCol} />
                    )}
                  </View>
                )}

                {/* Reason (Full width) */}
                {selectedLeave.reason ? (
                  <View style={styles.detailSectionFull}>
                    <Text style={styles.detailLabel}>Reason for Leave</Text>
                    <View style={styles.detailReasonBox}>
                      <Text style={styles.detailReasonText}>{selectedLeave.reason}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Applied On (Full width) */}
                {selectedLeave.created_at && (
                  <View style={styles.detailSectionFull}>
                    <Text style={styles.detailLabel}>Applied On</Text>
                    <Text style={[styles.detailValue, { fontSize: wp(3.8), color: darkTextSecondaryColor }]}>
                      {new Date(selectedLeave.created_at).toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {activeTab === 'approvals' && String(selectedLeave.status || '').toLowerCase() === 'pending' && !isHr ? (
                <View style={styles.approvalActionsRow}>
                  <TouchableOpacity
                    style={[styles.approvalBtn, styles.rejectBtn]}
                    onPress={() => handleUpdateLeaveStatus(selectedLeave.id, 'Rejected')}
                    disabled={updatingStatus}
                    activeOpacity={0.8}>
                    <Text style={styles.approvalBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approvalBtn, styles.approveBtn]}
                    onPress={() => handleUpdateLeaveStatus(selectedLeave.id, 'Approved')}
                    disabled={updatingStatus}
                    activeOpacity={0.8}>
                    {updatingStatus ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.approvalBtnText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <CommonButton
                  title="Close"
                  onPress={() => setDetailModalVisible(false)}
                  style={styles.detailCloseBtn}
                  textStyle={styles.submitBtnText}
                />
              )}
            </View>
          )}
        </View>
      </Modal>
      <AiAssistant />
    </View>
  );
};

export default ApplyLeaveScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: darkBackgroundColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
  },
  backButton: {
    padding: wp(1),
  },
  headerTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  headerRightSpacer: {
    width: wp(6),
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(5),
  },
  formCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(2.4),
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    marginBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    paddingBottom: hp(1.2),
  },
  formHeaderTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  dropdownField: {
    width: '100%',
    marginBottom: hp(2.4),
  },
  dateFieldsContainer: {
    marginBottom: hp(2.4),
  },
  dateRow: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  dateField: {
    flex: 1,
    backgroundColor: darkInputBgColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    minHeight: hp(7.5),
    justifyContent: 'center',
  },
  dateFieldInputError: {
    borderColor: '#F85149',
  },
  singleDateField: {
    width: '100%',
    backgroundColor: darkInputBgColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    minHeight: hp(7.5),
    justifyContent: 'center',
    marginBottom: hp(2.4),
  },
  fieldLabel: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.5),
  },
  dateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateValueText: {
    ...style.fontSizeNormal2x,
    color: darkTextPrimaryColor,
  },
  datePlaceholderText: {
    ...style.fontSizeNormal2x,
    color: darkPlaceholderColor,
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.2)',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.5),
    marginTop: hp(0.5),
  },
  durationText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  durationValueText: {
    fontWeight: '500',
    color: '#ffffff',
  },
  halfDayContainer: {
    width: '100%',
  },
  shortLeaveContainer: {
    width: '100%',
  },
  endTimeWrapper: {
    flex: 1,
  },
  endTimeError: {
    ...style.fontSizeSmall,
    color: '#F85149',
    marginTop: hp(0.5),
  },
  reasonInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.8),
    marginTop: hp(1.2),
  },
  reasonInputLabel: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
  },
  charCounter: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    opacity: 0.85,
  },
  reasonInputWrapper: {
    backgroundColor: darkInputBgColor,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    minHeight: hp(12),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    marginBottom: hp(2),
  },
  reasonInputWrapperError: {
    borderColor: '#F85149',
  },
  reasonTextInput: {
    ...style.fontSizeNormal2x,
    color: darkTextPrimaryColor,
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  submitBtn: {
    backgroundColor: PURPLE,
    height: hp(6),
    marginTop: hp(1),
  },
  errorText: {
    ...style.fontSizeSmall,
    color: '#F85149',
    marginTop: hp(0.4),
  },
  submitErrorText: {
    ...style.fontSizeSmall,
    color: '#F85149',
    textAlign: 'center',
    marginBottom: hp(2),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  modalCard: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  modalTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  calendar: {
    borderRadius: wp(3),
    overflow: 'hidden',
  },
  successRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  successBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  successCard: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(6),
    paddingVertical: hp(4),
    alignItems: 'center',
  },
  successIconWrapper: {
    marginBottom: hp(2),
  },
  successTitle: {
    fontSize: wp(6.5),
    fontWeight: 'bold',
    color: darkTextPrimaryColor,
    marginBottom: hp(1.2),
    textAlign: 'center',
  },
  successSubtitle: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginBottom: hp(3.5),
    lineHeight: hp(2.4),
  },
  summaryBox: {
    width: '100%',
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    marginBottom: hp(4),
    gap: hp(1.2),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  summaryValue: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  doneBtn: {
    backgroundColor: '#3DDC84',
    height: hp(5.8),
  },
  clockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  clockCard: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  clockModalTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    marginBottom: hp(2),
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    marginBottom: hp(3),
    gap: wp(2.5),
  },
  timeDisplayBox: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: wp(2),
  },
  timeDisplayBoxActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
  },
  timeDisplayText: {
    fontSize: wp(9),
    fontWeight: 'bold',
    color: darkTextSecondaryColor,
  },
  timeDisplayActiveText: {
    color: PURPLE,
  },
  timeColon: {
    fontSize: wp(8),
    fontWeight: 'bold',
    color: darkTextPrimaryColor,
  },
  ampmDisplayColumn: {
    justifyContent: 'center',
    gap: hp(0.5),
  },
  ampmMiniBtn: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(1),
    borderWidth: 1,
    borderColor: darkBorderColor,
    backgroundColor: darkInputBgColor,
  },
  ampmMiniBtnActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  ampmMiniBtnText: {
    fontSize: wp(2.8),
    fontWeight: '500',
    color: darkTextSecondaryColor,
  },
  ampmMiniBtnActiveText: {
    color: '#ffffff',
  },
  clockDial: {
    backgroundColor: darkInputBgColor,
    borderWidth: 1,
    borderColor: darkBorderColor,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: hp(3.5),
  },
  clockCenterDot: {
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
    backgroundColor: PURPLE,
    zIndex: 5,
  },
  clockNumberCell: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  clockNumberCellActive: {
    backgroundColor: PURPLE,
  },
  clockNumberText: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
  },
  clockNumberActiveText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  clockActions: {
    flexDirection: 'row',
    gap: wp(3),
    width: '100%',
  },
  clockCancelBtn: {
    flex: 1,
  },
  clockSetBtn: {
    flex: 1,
    backgroundColor: PURPLE,
  },
  timePickerField: {
    marginBottom: 0,
  },
  clockHandContainer: {
    position: 'absolute',
    width: 2,
    alignItems: 'center',
  },
  clockHandLine: {
    width: 2,
    backgroundColor: PURPLE,
  },
  clockHandCap: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: PURPLE,
    position: 'absolute',
    top: 0,
  },
  // Leave Listing Styles
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  listHeaderTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  applyNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
    gap: wp(1.5),
  },
  applyNewBtnText: {
    ...style.fontSizeNormal,
    color: '#ffffff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(10),
  },
  emptyContainer: {
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(6),
    paddingVertical: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
  },
  emptyIconContainer: {
    marginBottom: hp(2),
  },
  emptyTitle: {
    ...style.fontSizeNormal2x,
    fontWeight: 'bold',
    color: darkTextPrimaryColor,
    marginBottom: hp(1),
  },
  emptySubtitle: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginBottom: hp(3),
  },
  emptyApplyBtn: {
    backgroundColor: PURPLE,
    width: '60%',
    height: hp(5.5),
  },
  leaveCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(2),
    marginBottom: hp(1.8),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1.2),
  },
  cardLeaveType: {
    ...style.fontSizeNormal2x,
    fontWeight: 'bold',
    color: darkTextPrimaryColor,
    flex: 1,
    marginRight: wp(2),
  },
  statusBadge: {
    borderRadius: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
  },
  statusBadgePending: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
  },
  statusBadgeApproved: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  statusBadgeRejected: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  statusText: {
    fontSize: wp(3),
    fontWeight: 'bold',
  },
  statusTextPending: {
    color: '#F39C12',
  },
  statusTextApproved: {
    color: '#2ECC71',
  },
  statusTextRejected: {
    color: '#E74C3C',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(0.8),
  },
  cardText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
  },
  cardBoldText: {
    color: darkTextPrimaryColor,
    fontWeight: '500',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  
  // Detail Modal Styles
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  detailCard: {
    width: '100%',
    backgroundColor: darkSurfaceColor,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(5.5),
    paddingVertical: hp(3.5),
    maxHeight: hp(85),
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: darkBorderColor,
    paddingBottom: hp(1.5),
    marginBottom: hp(2.5),
  },
  detailTitle: {
    ...style.fontSizeNormal2x,
    fontWeight: 'bold',
    color: darkTextPrimaryColor,
  },
  detailSection: {
    marginBottom: hp(2.2),
  },
  detailLabel: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    marginBottom: hp(0.5),
  },
  detailValue: {
    ...style.fontSizeNormal2x,
    color: darkTextPrimaryColor,
    fontWeight: '500',
  },
  detailReasonBox: {
    backgroundColor: darkBackgroundColor,
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
    minHeight: hp(8),
    marginTop: hp(0.5),
  },
  detailReasonText: {
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    lineHeight: hp(2.2),
  },
  detailCloseBtn: {
    backgroundColor: PURPLE,
    marginTop: hp(2.5),
    height: hp(5.5),
  },
  detailScrollContent: {
    gap: hp(1.8),
    paddingBottom: hp(1),
  },
  detailStatusContainer: {
    flexDirection: 'row',
    marginTop: hp(0.5),
  },
  // Filter Styles
  filterContainer: {
    marginBottom: hp(2),
  },
  filterScroll: {
    paddingRight: wp(4),
    paddingVertical: hp(0.5),
  },
  filterChip: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    marginRight: wp(2.2),
  },
  filterChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  filterChipText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  noFilterResultsContainer: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingVertical: hp(4),
    paddingHorizontal: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(1.5),
  },
  noFilterResultsText: {
    ...style.fontSizeNormal,
    color: darkTextSecondaryColor,
    textAlign: 'center',
  },
  noFilterResultsIcon: {
    marginBottom: hp(1.2),
    opacity: 0.35,
  },
  statusFilterContainer: {
    marginBottom: hp(2.4),
  },
  statusChipActivePending: {
    backgroundColor: '#F39C12',
    borderColor: '#F39C12',
  },
  statusChipActiveApproved: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  statusChipActiveRejected: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(1),
    marginBottom: hp(2.2),
  },
  tabButton: {
    flex: 1,
    paddingVertical: hp(1.2),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(2.2),
  },
  tabButtonActive: {
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  tabButtonText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextSecondaryColor,
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  approvalActionsRow: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(2.5),
  },
  approvalBtn: {
    flex: 1,
    height: hp(5.6),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#2ECC71',
  },
  rejectBtn: {
    backgroundColor: '#E74C3C',
  },
  approvalBtnText: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: '#ffffff',
  },
  detailGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.8),
    gap: wp(4),
  },
  detailGridCol: {
    flex: 1,
  },
  detailSectionFull: {
    marginBottom: hp(1.8),
  },
});
