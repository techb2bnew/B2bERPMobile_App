import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GEOFENCE_EXIT_ALERT_MESSAGE,
  GEOFENCE_EXIT_ALERT_TITLE,
  GEOFENCE_NOT_AT_OFFICE,
  LOCATION_PERMISSION_DISABLED,
  LOCATION_PERMISSION_REQUIRED,
} from '../constants/Constants';
import {
  GEOFENCE_RADIUS_METERS,
  LOCATION_CHECK_INTERVAL_MS,
} from '../config/officeLocation';
import { geocodeOfficeAddress } from '../services/geocodingService';
import { useAuth } from './AuthContext';
import { saveDailyClockSession } from '../services/clockSessionsService';
import {
  clearLocationWatch,
  getCurrentPosition,
  getLocationErrorMessage,
  isWithinGeofence,
  openAppSettings,
  requestLocationPermission,
  watchUserLocation,
} from '../services/locationService';

const ATTENDANCE_SESSION_KEY = '@attendance_session';

const getTodayKey = () => new Date().toDateString();

const formatElapsedTime = totalSeconds => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
};

const getSegmentSeconds = clockInTimestamp => {
  if (!clockInTimestamp) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - clockInTimestamp) / 1000));
};

const AttendanceContext = createContext(null);

export const AttendanceProvider = ({ children }) => {
  const { user } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTimestamp, setClockInTimestamp] = useState(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [lastStopReason, setLastStopReason] = useState(null);

  const officeCoordsRef = useRef(null);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const isStoppingRef = useRef(false);
  const accumulatedSecondsRef = useRef(0);
  const clockInTimestampRef = useRef(null);
  const lastPersistedSecondsRef = useRef(0);

  const syncRefs = useCallback((accumulated, segmentStart) => {
    accumulatedSecondsRef.current = accumulated;
    clockInTimestampRef.current = segmentStart;
  }, []);

  const persistSession = useCallback(async session => {
    if (session) {
      await AsyncStorage.setItem(ATTENDANCE_SESSION_KEY, JSON.stringify(session));
      return;
    }
    await AsyncStorage.removeItem(ATTENDANCE_SESSION_KEY);
  }, []);

  const persistClockSession = useCallback(
    async (totalSeconds, { mode = 'set' } = {}) => {
      if (!user?.id || totalSeconds <= 0) {
        return;
      }

      let secondsToSave = totalSeconds;

      if (mode === 'add') {
        secondsToSave = totalSeconds - lastPersistedSecondsRef.current;
        if (secondsToSave <= 0) {
          return;
        }
      }

      try {
        await saveDailyClockSession({
          employeeId: user.id,
          employeeName: user.name || 'Employee',
          hoursToSave: secondsToSave,
          segmentClockIn: clockInTimestampRef.current,
          mergeMode: mode,
        });
        lastPersistedSecondsRef.current = totalSeconds;
      } catch (error) {
        console.warn('Failed to save clock session:', error?.message);
      }
    },
    [user?.id, user?.name],
  );

  const resetDayTracking = useCallback(() => {
    lastPersistedSecondsRef.current = 0;
    syncRefs(0, null);
    setAccumulatedSeconds(0);
    setIsClockedIn(false);
    setClockInTimestamp(null);
    setElapsedSeconds(0);
  }, [syncRefs]);

  const getTotalElapsed = useCallback(() => {
    return (
      accumulatedSecondsRef.current +
      getSegmentSeconds(clockInTimestampRef.current)
    );
  }, []);

  const restoreSession = useCallback(async () => {
    const stored = await AsyncStorage.getItem(ATTENDANCE_SESSION_KEY);
    if (!stored) {
      return;
    }

    const session = JSON.parse(stored);

    if (session.sessionDate !== getTodayKey()) {
      await persistSession(null);
      return;
    }

    const savedAccumulated = session.accumulatedSeconds || 0;
    const savedPersisted = session.lastPersistedSeconds ?? savedAccumulated;
    lastPersistedSecondsRef.current = savedPersisted;
    syncRefs(savedAccumulated, null);
    setAccumulatedSeconds(savedAccumulated);

    if (session.status === 'active' && session.clockInTimestamp) {
      syncRefs(savedAccumulated, session.clockInTimestamp);
      setIsClockedIn(true);
      setClockInTimestamp(session.clockInTimestamp);
      setElapsedSeconds(savedAccumulated + getSegmentSeconds(session.clockInTimestamp));
      return;
    }

    if (session.status === 'paused') {
      setIsClockedIn(false);
      setClockInTimestamp(null);
      setElapsedSeconds(savedAccumulated);
      setLastStopReason(session.lastStopReason || null);
    }
  }, [persistSession, syncRefs]);

  const stopLocationWatch = useCallback(() => {
    clearLocationWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  const clearTimerInterval = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showPermissionAlert = useCallback(() => {
    Alert.alert(
      LOCATION_PERMISSION_REQUIRED,
      LOCATION_PERMISSION_DISABLED,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openAppSettings },
      ],
    );
  }, []);

  const endDaySession = useCallback(
    async reason => {
      const total = getTotalElapsed();
      await persistClockSession(total, { mode: 'add' });

      stopLocationWatch();
      clearTimerInterval();
      resetDayTracking();
      setLastStopReason(reason);
      await persistSession(null);
    },
    [
      clearTimerInterval,
      getTotalElapsed,
      persistClockSession,
      persistSession,
      resetDayTracking,
      stopLocationWatch,
    ],
  );

  const autoEndSession = useCallback(
    async (reason, { showAlert = true, alertTitle, alertMessage } = {}) => {
      const total = getTotalElapsed();
      await persistClockSession(total, { mode: 'add' });

      stopLocationWatch();
      clearTimerInterval();
      resetDayTracking();
      setLastStopReason(reason);
      await persistSession(null);

      if (showAlert) {
        Alert.alert(
          alertTitle || GEOFENCE_EXIT_ALERT_TITLE,
          alertMessage || GEOFENCE_EXIT_ALERT_MESSAGE,
        );
      }
    },
    [
      clearTimerInterval,
      getTotalElapsed,
      persistClockSession,
      persistSession,
      resetDayTracking,
      stopLocationWatch,
    ],
  );

  const pauseSession = useCallback(
    async (reason, { showAlert = false, alertTitle, alertMessage } = {}) => {
      const total = getTotalElapsed();

      await persistClockSession(total, { mode: 'set' });

      stopLocationWatch();
      clearTimerInterval();
      syncRefs(total, null);
      setAccumulatedSeconds(total);
      setIsClockedIn(false);
      setClockInTimestamp(null);
      setElapsedSeconds(total);
      setLastStopReason(reason);

      await persistSession({
        status: 'paused',
        accumulatedSeconds: total,
        lastPersistedSeconds: lastPersistedSecondsRef.current,
        lastStopReason: reason,
        sessionDate: getTodayKey(),
        pausedAt: Date.now(),
      });

      if (showAlert) {
        Alert.alert(
          alertTitle || GEOFENCE_EXIT_ALERT_TITLE,
          alertMessage || GEOFENCE_EXIT_ALERT_MESSAGE,
        );
      }
    },
    [clearTimerInterval, getTotalElapsed, persistClockSession, persistSession, stopLocationWatch, syncRefs],
  );

  const forceStopTimer = useCallback(
    async (reason, { showAlert = true, alertTitle, alertMessage } = {}) => {
      if (isStoppingRef.current) {
        return;
      }

      isStoppingRef.current = true;
      await autoEndSession(reason, { showAlert, alertTitle, alertMessage });
      isStoppingRef.current = false;
    },
    [autoEndSession],
  );

  const ensureOfficeCoordinates = useCallback(async () => {
    if (officeCoordsRef.current) {
      return officeCoordsRef.current;
    }

    const coordinates = await geocodeOfficeAddress();
    officeCoordsRef.current = coordinates;
    return coordinates;
  }, []);

  const verifyUserAtOffice = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      showPermissionAlert();
      return { ok: false, permissionDenied: true };
    }

    const officeCoordinates = await ensureOfficeCoordinates();
    const currentLocation = await getCurrentPosition();
    const { isInside, distanceMeters } = isWithinGeofence(
      currentLocation,
      officeCoordinates,
      GEOFENCE_RADIUS_METERS,
    );

    return {
      ok: isInside,
      currentLocation,
      officeCoordinates,
      distanceMeters,
    };
  }, [ensureOfficeCoordinates, showPermissionAlert]);

  const handleGeofenceCheck = useCallback(
    async currentLocation => {
      if (!officeCoordsRef.current || !isClockedIn) {
        return;
      }

      const { isInside } = isWithinGeofence(
        currentLocation,
        officeCoordsRef.current,
        GEOFENCE_RADIUS_METERS,
      );

      if (!isInside) {
        await forceStopTimer('Left office area (auto)', {
          showAlert: true,
          alertTitle: GEOFENCE_EXIT_ALERT_TITLE,
          alertMessage: GEOFENCE_EXIT_ALERT_MESSAGE,
        });
      }
    },
    [forceStopTimer, isClockedIn],
  );

  const startLocationWatch = useCallback(async () => {
    stopLocationWatch();

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      await forceStopTimer('Location permission disabled', {
        showAlert: true,
        alertTitle: LOCATION_PERMISSION_REQUIRED,
        alertMessage: LOCATION_PERMISSION_DISABLED,
      });
      return;
    }

    watchIdRef.current = watchUserLocation(
      location => {
        handleGeofenceCheck(location);
      },
      error => {
        if (error?.code === 1) {
          forceStopTimer('Location permission disabled', {
            showAlert: true,
            alertTitle: LOCATION_PERMISSION_REQUIRED,
            alertMessage: LOCATION_PERMISSION_DISABLED,
          });
          return;
        }

        if (error?.code === 2 || error?.code === 3) {
          forceStopTimer('Location unavailable', {
            showAlert: true,
            alertTitle: 'Location Error',
            alertMessage: getLocationErrorMessage(error),
          });
        }
      },
      {
        interval: LOCATION_CHECK_INTERVAL_MS,
        fastestInterval: LOCATION_CHECK_INTERVAL_MS,
      },
    );
  }, [forceStopTimer, handleGeofenceCheck, stopLocationWatch]);

  const startTimerSession = useCallback(
    async resumeAccumulated => {
      const now = Date.now();
      const baseSeconds = resumeAccumulated ?? accumulatedSecondsRef.current;

      syncRefs(baseSeconds, now);
      setAccumulatedSeconds(baseSeconds);
      setClockInTimestamp(now);
      setIsClockedIn(true);
      setElapsedSeconds(baseSeconds);
      setLastStopReason(null);

      await persistSession({
        status: 'active',
        clockInTimestamp: now,
        accumulatedSeconds: baseSeconds,
        sessionDate: getTodayKey(),
      });
    },
    [persistSession, syncRefs],
  );

  const handleClockIn = useCallback(async () => {
    if (isClockedIn || isCheckingLocation) {
      return;
    }

    setIsCheckingLocation(true);

    try {
      const result = await verifyUserAtOffice();
      if (result.permissionDenied) {
        return;
      }

      if (!result.ok) {
        const distanceText =
          result.distanceMeters != null
            ? ` You are about ${Math.round(result.distanceMeters)}m away.`
            : '';
        Alert.alert(
          GEOFENCE_NOT_AT_OFFICE,
          `You must be within ${GEOFENCE_RADIUS_METERS} meters of the office to clock in.${distanceText}`,
        );
        return;
      }

      await startTimerSession(accumulatedSecondsRef.current);
    } catch (error) {
      Alert.alert('Clock In Failed', getLocationErrorMessage(error));
    } finally {
      setIsCheckingLocation(false);
    }
  }, [isCheckingLocation, isClockedIn, startTimerSession, verifyUserAtOffice]);

  const handleClockOutPress = useCallback(() => {
    if (!isClockedIn) {
      return;
    }
    setShowReasonModal(true);
  }, [isClockedIn]);

  const confirmClockOut = useCallback(
    async ({ reason, endDay }) => {
      if (!reason?.trim()) {
        return;
      }

      setShowReasonModal(false);

      if (endDay) {
        await endDaySession(reason.trim());
        return;
      }

      await pauseSession(reason.trim());
    },
    [endDaySession, pauseSession],
  );

  const handlePrimaryAction = useCallback(() => {
    if (isClockedIn) {
      handleClockOutPress();
      return;
    }
    handleClockIn();
  }, [handleClockIn, handleClockOutPress, isClockedIn]);

  const isPaused = !isClockedIn && accumulatedSeconds > 0;

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!isClockedIn || !clockInTimestamp) {
      clearTimerInterval();
      if (!isClockedIn) {
        setElapsedSeconds(accumulatedSecondsRef.current);
      }
      return;
    }

    const tick = () => {
      setElapsedSeconds(
        accumulatedSecondsRef.current +
          getSegmentSeconds(clockInTimestampRef.current),
      );
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return clearTimerInterval;
  }, [clearTimerInterval, clockInTimestamp, isClockedIn]);

  useEffect(() => {
    if (!isClockedIn) {
      stopLocationWatch();
      return;
    }

    ensureOfficeCoordinates()
      .then(() => startLocationWatch())
      .catch(error => {
        forceStopTimer('Office location unavailable', {
          showAlert: true,
          alertTitle: 'Location Setup Error',
          alertMessage: error?.message || 'Office coordinates could not be loaded.',
        });
      });

    return stopLocationWatch;
  }, [ensureOfficeCoordinates, forceStopTimer, isClockedIn, startLocationWatch, stopLocationWatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active' || !isClockedIn) {
        return;
      }

      verifyUserAtOffice()
        .then(result => {
          if (result.permissionDenied) {
            return;
          }

          if (result.ok === false && result.distanceMeters != null) {
            forceStopTimer('Left office area (auto)', {
              showAlert: true,
              alertTitle: GEOFENCE_EXIT_ALERT_TITLE,
              alertMessage: GEOFENCE_EXIT_ALERT_MESSAGE,
            });
          }
        })
        .catch(error => {
          if (error?.code === 1) {
            forceStopTimer('Location permission disabled', {
              showAlert: true,
              alertTitle: LOCATION_PERMISSION_REQUIRED,
              alertMessage: LOCATION_PERMISSION_DISABLED,
            });
            return;
          }

          Alert.alert('Location Error', getLocationErrorMessage(error));
        });
    });

    return () => subscription.remove();
  }, [forceStopTimer, isClockedIn, verifyUserAtOffice]);

  const value = useMemo(
    () => ({
      isClockedIn,
      isPaused,
      elapsedSeconds,
      formattedTime: formatElapsedTime(elapsedSeconds),
      isCheckingLocation,
      showReasonModal,
      lastStopReason,
      handlePrimaryAction,
      confirmClockOut,
      closeReasonModal: () => setShowReasonModal(false),
    }),
    [
      confirmClockOut,
      elapsedSeconds,
      handlePrimaryAction,
      isCheckingLocation,
      isClockedIn,
      isPaused,
      lastStopReason,
      showReasonModal,
    ],
  );

  return (
    <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within AttendanceProvider');
  }
  return context;
};
