import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAttendance } from '../context/AttendanceContext';
import {
  fetchHoursForEmployeeInRange,
  formatDecimalHours,
  formatWorkHours,
  getCurrentWeekRange,
  getLocalDateKey,
  subscribeToEmployeeClockSessions,
} from '../services/clockSessionsService';
import { syncSupabaseRealtimeAuth } from '../lib/supabase';

const buildEmptyRangeData = (startDateKey, endDateKey) => ({
  days: [],
  totalHours: 0,
  avgHours: 0,
  attendancePercent: 0,
  totalHoursLabel: '0h',
  avgHoursLabel: '0h',
  attendanceLabel: '0%',
  startDateKey,
  endDateKey,
});

const applyLiveTodayHours = (rangeData, elapsedSeconds, startDateKey, endDateKey) => {
  if (!rangeData) {
    return buildEmptyRangeData(startDateKey, endDateKey);
  }

  const todayKey = getLocalDateKey();
  const todayDay = rangeData.days?.find(day => day.dateKey === todayKey);

  // Segment-based hours already include open working time; don't mix local timer.
  if (todayDay?.fromSegments) {
    return rangeData;
  }

  const liveHours = elapsedSeconds / 3600;
  const includesToday = todayKey >= startDateKey && todayKey <= endDateKey;

  if (!includesToday || liveHours <= 0) {
    return rangeData;
  }

  const days = rangeData.days.map(day => {
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

  return {
    ...rangeData,
    days,
    totalHours,
    avgHours,
    attendancePercent: Math.round((workedDays / days.length) * 100),
    totalHoursLabel: formatDecimalHours(totalHours),
    avgHoursLabel: formatDecimalHours(avgHours),
    attendanceLabel: `${Math.round((workedDays / days.length) * 100)}%`,
  };
};

export const useTimeSheetHours = (employeeId, dateRange) => {
  const { elapsedSeconds, isClockedIn } = useAttendance();
  const [rangeData, setRangeData] = useState(buildEmptyRangeData('', ''));
  const [loading, setLoading] = useState(true);

  const startDateKey = dateRange?.startDateKey;
  const endDateKey = dateRange?.endDateKey;

  const loadRangeHours = useCallback(async () => {
    if (!employeeId || !startDateKey || !endDateKey) {
      setRangeData(buildEmptyRangeData(startDateKey, endDateKey));
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await fetchHoursForEmployeeInRange(
        employeeId,
        startDateKey,
        endDateKey,
      );
      setRangeData({
        ...data,
        startDateKey,
        endDateKey,
      });
    } catch {
      setRangeData(buildEmptyRangeData(startDateKey, endDateKey));
    } finally {
      setLoading(false);
    }
  }, [employeeId, endDateKey, startDateKey]);

  useFocusEffect(
    useCallback(() => {
      loadRangeHours();
    }, [loadRangeHours]),
  );

  useEffect(() => {
    if (!employeeId || isClockedIn) {
      return;
    }

    loadRangeHours();
  }, [employeeId, isClockedIn, loadRangeHours]);

  useEffect(() => {
    if (!employeeId) {
      return undefined;
    }

    syncSupabaseRealtimeAuth().catch(() => {});

    const unsubscribe = subscribeToEmployeeClockSessions(employeeId, () => {
      loadRangeHours();
    });

    return unsubscribe;
  }, [employeeId, loadRangeHours]);

  const currentWeek = getCurrentWeekRange();
  const isCurrentWeek =
    startDateKey === currentWeek.startDateKey &&
    endDateKey === currentWeek.endDateKey;

  return {
    rangeData: applyLiveTodayHours(
      rangeData,
      elapsedSeconds,
      startDateKey,
      endDateKey,
    ),
    loading,
    isCurrentWeek,
    refresh: loadRangeHours,
  };
};
