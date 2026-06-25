import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAttendance } from '../context/AttendanceContext';
import {
  fetchWeeklyHoursForEmployee,
  formatDecimalHours,
  formatWorkHours,
  getEmptyWeeklyHours,
  getLocalDateKey,
  subscribeToEmployeeClockSessions,
} from '../services/clockSessionsService';
import { syncSupabaseRealtimeAuth } from '../lib/supabase';

const applyLiveTodayHours = (weeklyData, elapsedSeconds) => {
  if (!weeklyData) {
    return getEmptyWeeklyHours();
  }

  const todayKey = getLocalDateKey();
  const liveHours = elapsedSeconds / 3600;

  const days = weeklyData.days.map(day => {
    if (day.dateKey !== todayKey) {
      return day;
    }

    const hours = Math.max(day.hours, liveHours);

    return {
      ...day,
      hours,
      hoursLabel: formatWorkHours(hours),
      barPercent: Math.min(100, (hours / 8) * 100),
    };
  });

  const totalHours = days.reduce((sum, day) => sum + day.hours, 0);
  const workedDays = days.filter(day => day.hours > 0).length;
  const avgHours = days.length ? totalHours / days.length : 0;
  const attendancePercent = Math.round((workedDays / days.length) * 100);

  return {
    ...weeklyData,
    days,
    totalHours,
    avgHours,
    attendancePercent,
    totalHoursLabel: formatDecimalHours(totalHours),
    avgHoursLabel: formatDecimalHours(avgHours),
    attendanceLabel: `${attendancePercent}%`,
  };
};

export const useWeeklyHours = employeeId => {
  const { elapsedSeconds, isClockedIn } = useAttendance();
  const [weeklyData, setWeeklyData] = useState(getEmptyWeeklyHours());
  const [loading, setLoading] = useState(true);

  const loadWeeklyHours = useCallback(async ({ silent = false } = {}) => {
    if (!employeeId) {
      setWeeklyData(getEmptyWeeklyHours());
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await fetchWeeklyHoursForEmployee(employeeId);
      setWeeklyData(data);
    } catch {
      setWeeklyData(getEmptyWeeklyHours());
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [employeeId]);

  useFocusEffect(
    useCallback(() => {
      loadWeeklyHours();
    }, [loadWeeklyHours]),
  );

  useEffect(() => {
    if (!employeeId || isClockedIn) {
      return;
    }

    loadWeeklyHours({ silent: true });
  }, [employeeId, isClockedIn, loadWeeklyHours]);

  useEffect(() => {
    if (!employeeId) {
      return undefined;
    }

    syncSupabaseRealtimeAuth().catch(() => {});

    const unsubscribe = subscribeToEmployeeClockSessions(employeeId, () => {
      loadWeeklyHours({ silent: true });
    });

    return unsubscribe;
  }, [employeeId, loadWeeklyHours]);

  return {
    weeklyData: applyLiveTodayHours(weeklyData, elapsedSeconds),
    loading,
    refresh: loadWeeklyHours,
  };
};
