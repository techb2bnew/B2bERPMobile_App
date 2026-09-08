import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AppHeader from '../../components/AppHeader';
import AiAssistant from '../../components/AiAssistant';
import { useAuth } from '../../context/AuthContext';
import {
  MY_PAYROLL_TITLE,
  MY_PAYROLL_SUBTITLE,
  PIN_GATE_LOCKED_TITLE,
  PIN_GATE_LOCKED_SUBTITLE,
  PIN_GATE_SET_TITLE,
  PIN_GATE_SET_NEW_TITLE,
  PIN_GATE_SET_SUBTITLE,
  PIN_GATE_FORGOT_TITLE,
  PIN_GATE_FORGOT_SUBTITLE,
  PIN_GATE_FORGOT_LINK,
  PIN_GATE_UNLOCK,
  PIN_GATE_SAVE,
  PIN_GATE_VERIFY,
  PIN_GATE_BACK,
  PIN_ERR_TOO_SHORT,
  PIN_ERR_MISMATCH,
  PIN_ERR_WRONG,
  PIN_ERR_SAVE_FAILED,
  PIN_ERR_WRONG_PASSWORD,
} from '../../constants/Constants';
import {
  darkBorderColor,
  darkInputBgColor,
  darkPlaceholderColor,
  darkSurfaceColor,
  darkTextPrimaryColor,
  darkTextSecondaryColor,
} from '../../constants/Color';
import { style } from '../../constants/Fonts';
import {
  PAYROLL_PIN_MIN_LENGTH,
  fetchPayrollPinHash,
  setPayrollPin,
  verifyAccountPassword,
  verifyPayrollPin,
} from '../../services/payrollPinService';
import {
  fetchEmployeeSalary,
  isSalarySourceConfigured,
  setEmployeeSalary,
} from '../../services/employeeSalaryService';
import {
  calculateSalaryProjection,
  fetchEmployeeHrmsData,
  getDaysInMonth,
} from '../../services/hrmsService';
import { getEmployeeProfileById } from '../../services/employeeService';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

const PURPLE = '#9B59B6';
const GREEN = '#3DDC84';
const RED = '#E85D5D';
const AMBER = '#F5C542';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthKeyOf = (year, monthIndex) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const monthLabelOf = (year, monthIndex) => `${MONTH_NAMES[monthIndex]} ${year}`;

const formatMoney = amount => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDays = value => {
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};

const formatDayLabel = dateKey => {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day} ${MONTH_NAMES[month - 1].slice(0, 3)}`;
};

/**
 * The employee's start month — `created_at` first, then `join_date`, same
 * order the admin app uses. The month picker cannot go earlier than this.
 */
const resolveJoinFloor = profile => {
  const candidates = [profile?.created_at, profile?.join_date];
  for (const raw of candidates) {
    if (!raw) {
      continue;
    }
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return { year: date.getFullYear(), monthIndex: date.getMonth(), dateKey: raw };
    }
  }
  return null;
};

/* ---------------------------- PIN gate ---------------------------- */

const PayrollPinGate = ({ employeeId, userEmail, onUnlock }) => {
  const [step, setStep] = useState('loading');
  const [existingHash, setExistingHash] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hash = await fetchPayrollPinHash(employeeId);
      if (cancelled) {
        return;
      }
      setExistingHash(hash);
      setStep(hash ? 'enter' : 'set');
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const handleSetPin = async () => {
    setError('');
    if (pin.length < PAYROLL_PIN_MIN_LENGTH) {
      setError(PIN_ERR_TOO_SHORT);
      return;
    }
    if (pin !== confirmPin) {
      setError(PIN_ERR_MISMATCH);
      return;
    }

    setSubmitting(true);
    try {
      await setPayrollPin(employeeId, pin);
      onUnlock();
    } catch {
      setError(PIN_ERR_SAVE_FAILED);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnterPin = async () => {
    setError('');
    if (!existingHash) {
      return;
    }
    setSubmitting(true);
    const matches = await verifyPayrollPin(pin, existingHash);
    setSubmitting(false);
    if (!matches) {
      setError(PIN_ERR_WRONG);
      return;
    }
    onUnlock();
  };

  const handleVerifyPassword = async () => {
    setError('');
    setSubmitting(true);
    try {
      const ok = await verifyAccountPassword(userEmail, accountPassword);
      if (!ok) {
        setError(PIN_ERR_WRONG_PASSWORD);
        return;
      }
      setPin('');
      setConfirmPin('');
      setAccountPassword('');
      setStep('forgot-set');
    } catch (err) {
      setError(err?.message || PIN_ERR_WRONG_PASSWORD);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <View style={styles.gateCard}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const isSetStep = step === 'set' || step === 'forgot-set';
  const isForgotVerify = step === 'forgot-verify';

  return (
    <KeyboardAvoidingView
      style={styles.gateWrap}
      behavior="height"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}>
      <ScrollView
        contentContainerStyle={styles.gateScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.gateCard}>
          <View style={styles.gateIcon}>
            <Icon
              name={isSetStep || isForgotVerify ? 'key' : 'lock'}
              size={wp(6)}
              color={PURPLE}
            />
          </View>

          <Text style={styles.gateTitle}>
            {isForgotVerify
              ? PIN_GATE_FORGOT_TITLE
              : step === 'forgot-set'
                ? PIN_GATE_SET_NEW_TITLE
                : step === 'set'
                  ? PIN_GATE_SET_TITLE
                  : PIN_GATE_LOCKED_TITLE}
          </Text>
          <Text style={styles.gateSubtitle}>
            {isForgotVerify
              ? PIN_GATE_FORGOT_SUBTITLE
              : isSetStep
                ? PIN_GATE_SET_SUBTITLE
                : PIN_GATE_LOCKED_SUBTITLE}
          </Text>

          {isForgotVerify ? (
            <TextInput
              style={styles.gateInput}
              value={accountPassword}
              onChangeText={text => {
                setAccountPassword(text);
                setError('');
              }}
              placeholder="Account password"
              placeholderTextColor={darkPlaceholderColor}
              secureTextEntry
              autoFocus
              editable={!submitting}
            />
          ) : (
            <>
              <TextInput
                style={styles.gateInput}
                value={pin}
                onChangeText={text => {
                  setPin(text);
                  setError('');
                }}
                placeholder={isSetStep ? 'New PIN' : 'PIN'}
                placeholderTextColor={darkPlaceholderColor}
                secureTextEntry
                keyboardType="number-pad"
                autoFocus
                editable={!submitting}
              />
              {isSetStep ? (
                <TextInput
                  style={styles.gateInput}
                  value={confirmPin}
                  onChangeText={text => {
                    setConfirmPin(text);
                    setError('');
                  }}
                  placeholder="Confirm PIN"
                  placeholderTextColor={darkPlaceholderColor}
                  secureTextEntry
                  keyboardType="number-pad"
                  editable={!submitting}
                />
              ) : null}
            </>
          )}

          {error ? <Text style={styles.gateError}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.gateButton, submitting && styles.gateButtonDisabled]}
            disabled={submitting}
            activeOpacity={0.85}
            onPress={
              isForgotVerify
                ? handleVerifyPassword
                : isSetStep
                  ? handleSetPin
                  : handleEnterPin
            }>
            {submitting ? (
              <ActivityIndicator size="small" color={darkTextPrimaryColor} />
            ) : (
              <Text style={styles.gateButtonText}>
                {isForgotVerify
                  ? PIN_GATE_VERIFY
                  : isSetStep
                    ? PIN_GATE_SAVE
                    : PIN_GATE_UNLOCK}
              </Text>
            )}
          </TouchableOpacity>

          {step === 'enter' ? (
            <TouchableOpacity
              onPress={() => {
                setError('');
                setPin('');
                setStep('forgot-verify');
              }}
              style={styles.gateLinkWrap}>
              <Text style={styles.gateLink}>{PIN_GATE_FORGOT_LINK}</Text>
            </TouchableOpacity>
          ) : null}

          {isForgotVerify ? (
            <TouchableOpacity
              onPress={() => {
                setError('');
                setAccountPassword('');
                setStep('enter');
              }}
              style={styles.gateLinkWrap}>
              <Text style={styles.gateLink}>{PIN_GATE_BACK}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/* --------------------------- Payroll body --------------------------- */

const Row = ({ label, value, valueColor }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
  </View>
);

const MyPayrollScreen = () => {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  }));

  const [profile, setProfile] = useState(null);
  const [hrms, setHrms] = useState(null);
  const [baseSalary, setBaseSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  const salarySourceReady = useMemo(() => isSalarySourceConfigured(), []);
  const monthKey = monthKeyOf(cursor.year, cursor.monthIndex);
  const daysInMonth = getDaysInMonth(cursor.year, cursor.monthIndex + 1);

  const joinFloor = useMemo(() => resolveJoinFloor(profile), [profile]);
  const isCurrentMonth =
    cursor.year === today.getFullYear() && cursor.monthIndex === today.getMonth();
  const isJoinMonth = joinFloor
    ? cursor.year === joinFloor.year && cursor.monthIndex === joinFloor.monthIndex
    : false;
  const atJoinFloor = joinFloor
    ? cursor.year < joinFloor.year ||
      (cursor.year === joinFloor.year && cursor.monthIndex <= joinFloor.monthIndex)
    : false;

  // Profile and salary are fetched once.
  useEffect(() => {
    if (!unlocked || !user?.id) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [prof, salary] = await Promise.all([
          getEmployeeProfileById(user.id).catch(() => null),
          fetchEmployeeSalary(user.id).catch(() => null),
        ]);
        if (cancelled) {
          return;
        }
        setProfile(prof);
        setBaseSalary(salary);
      } catch {
        // The HRMS load still runs even if this fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unlocked, user?.id]);

  // HRMS data reloads whenever the month changes.
  const loadHrms = useCallback(async () => {
    if (!unlocked || !user?.id) {
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchEmployeeHrmsData(user.id, monthKey);
      setHrms(data);
    } catch (err) {
      setLoadError(err?.message || 'Could not load your payroll.');
    } finally {
      setLoading(false);
    }
  }, [unlocked, user?.id, monthKey]);

  useEffect(() => {
    loadHrms();
  }, [loadHrms]);

  const shiftMonth = delta => {
    setCursor(prev => {
      const next = new Date(prev.year, prev.monthIndex + delta, 1);
      let year = next.getFullYear();
      let monthIndex = next.getMonth();
      if (
        joinFloor &&
        (year < joinFloor.year ||
          (year === joinFloor.year && monthIndex < joinFloor.monthIndex))
      ) {
        year = joinFloor.year;
        monthIndex = joinFloor.monthIndex;
      }
      return { year, monthIndex };
    });
  };

  // Passing `hrms?.summary || {}` straight into the deps would build a new
  // object on every render and defeat the memo, so memoize it separately.
  const summary = useMemo(() => hrms?.summary || {}, [hrms]);
  const projection = useMemo(
    () => calculateSalaryProjection(baseSalary || 0, summary, daysInMonth),
    [baseSalary, summary, daysInMonth],
  );

  const deductionDays = useMemo(() => {
    if (!hrms?.datesList || !hrms?.dayWise) {
      return [];
    }
    const out = [];
    hrms.datesList.forEach(dateKey => {
      const status = hrms.dayWise[dateKey]?.status;
      if (!status) {
        return;
      }
      if (status === 'Absent' || status === 'Unpaid Leave' || status === 'Sandwich Leave') {
        out.push({ date: dateKey, label: status, deduct: 1 });
      } else if (status === 'Half Day' || status === 'Short Leave') {
        out.push({ date: dateKey, label: status, deduct: 0.5 });
      }
    });
    return out;
  }, [hrms]);

  const handleSaveSalary = async () => {
    const amount = Number(String(salaryDraft).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('My Payroll', 'Enter a valid monthly salary.');
      return;
    }
    setSavingSalary(true);
    try {
      await setEmployeeSalary(user.id, amount);
      setBaseSalary(amount);
      setEditingSalary(false);
    } catch (err) {
      Alert.alert('My Payroll', err?.message || 'Failed to save salary.');
    } finally {
      setSavingSalary(false);
    }
  };

  if (!user?.id) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <AppHeader title={MY_PAYROLL_TITLE} />
          <Text style={styles.emptyText}>
            Your employee profile was not found. Contact HR.
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          <AppHeader title={MY_PAYROLL_TITLE} />
          <PayrollPinGate
            employeeId={user.id}
            userEmail={user.email}
            onUnlock={() => setUnlocked(true)}
          />
        </SafeAreaView>
      </View>
    );
  }

  const salaryMissing = baseSalary === null || baseSalary === 0;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={MY_PAYROLL_TITLE} />

        <View style={styles.topBar}>
          <Text style={styles.subtitle}>{MY_PAYROLL_SUBTITLE}</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => shiftMonth(-1)}
              disabled={atJoinFloor}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={atJoinFloor && styles.navDisabled}>
              <Icon name="chevron-left" size={wp(5)} color={darkTextPrimaryColor} />
            </TouchableOpacity>
            <View style={styles.monthLabelWrap}>
              <Icon name="calendar" size={wp(3.6)} color={PURPLE} />
              <Text style={styles.monthLabel}>
                {monthLabelOf(cursor.year, cursor.monthIndex)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => shiftMonth(1)}
              disabled={isCurrentMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={isCurrentMonth && styles.navDisabled}>
              <Icon name="chevron-right" size={wp(5)} color={darkTextPrimaryColor} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && !hrms ? (
          <ActivityIndicator size="large" color={PURPLE} style={styles.loader} />
        ) : loadError ? (
          <Text style={styles.emptyText}>{loadError}</Text>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {isJoinMonth ? (
              <View style={[styles.banner, styles.bannerInfo]}>
                <Text style={styles.bannerInfoText}>
                  This is your first month — only days from your joining date
                  onward are counted. Earlier months aren't available.
                </Text>
              </View>
            ) : null}

            {isCurrentMonth ? (
              <View style={[styles.banner, styles.bannerWarn]}>
                <Text style={styles.bannerWarnText}>
                  This month is still running — days after today aren't counted
                  yet, so net pay is a running projection.
                </Text>
              </View>
            ) : null}

            {!salarySourceReady ? (
              <View style={[styles.banner, styles.bannerWarn]}>
                <Text style={styles.bannerWarnText}>
                  Salary source isn't configured — add the Finance project URL
                  and anon key in src/config/financeSupabaseConfig.js to see
                  base salary and net pay.
                </Text>
              </View>
            ) : null}

            {/* Header card */}
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <Text style={styles.name} numberOfLines={1}>
                    {profile?.name || user?.name || 'You'}
                  </Text>
                  <Text style={styles.role} numberOfLines={1}>
                    {profile?.role || user?.role || ''}
                  </Text>
                </View>
                <View style={styles.netPayWrap}>
                  <Text style={styles.netPayLabel}>NET PAY</Text>
                  <Text
                    style={[
                      styles.netPayValue,
                      salaryMissing && { color: RED },
                    ]}>
                    {salaryMissing ? 'N/A' : formatMoney(projection.netPayable)}
                  </Text>
                </View>
              </View>

              <View style={styles.rowGroup}>
                {editingSalary ? (
                  <View style={styles.salaryEditWrap}>
                    <Text style={styles.rowLabel}>Base Salary (Monthly)</Text>
                    <View style={styles.salaryEditRow}>
                      <TextInput
                        style={styles.salaryInput}
                        value={salaryDraft}
                        onChangeText={setSalaryDraft}
                        placeholder="e.g. 30000"
                        placeholderTextColor={darkPlaceholderColor}
                        keyboardType="number-pad"
                        autoFocus
                        editable={!savingSalary}
                      />
                      <TouchableOpacity
                        style={styles.salarySaveBtn}
                        onPress={handleSaveSalary}
                        disabled={savingSalary}
                        activeOpacity={0.85}>
                        {savingSalary ? (
                          <ActivityIndicator size="small" color={darkTextPrimaryColor} />
                        ) : (
                          <Text style={styles.salarySaveText}>Save</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingSalary(false)}
                        style={styles.salaryCancelBtn}>
                        <Text style={styles.salaryCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSalaryDraft(baseSalary ? String(baseSalary) : '');
                      setEditingSalary(true);
                    }}>
                    <Text style={styles.rowLabel}>Base Salary (Monthly)</Text>
                    <View style={styles.rowValueWithIcon}>
                      <Text style={styles.rowValue}>
                        {salaryMissing ? 'Not set' : formatMoney(baseSalary)}
                      </Text>
                      <Icon name="edit-2" size={wp(3.2)} color={darkTextSecondaryColor} />
                    </View>
                  </TouchableOpacity>
                )}

                <Row
                  label="Payable Days"
                  value={`${formatDays(summary.payableDays)} / ${daysInMonth}`}
                />
                <Row
                  label="Paid Leave Used"
                  value={`${formatDays(summary.paidLeave)} · ${formatDays(
                    summary.quarterLeavesLeft,
                  )} left this quarter`}
                />
                <Row
                  label="Net Pay"
                  value={salaryMissing ? 'N/A' : formatMoney(projection.netPayable)}
                  valueColor={salaryMissing ? RED : GREEN}
                />
              </View>
            </View>

            {/* Deduction breakdown */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Icon name="credit-card" size={wp(4)} color={PURPLE} />
                <Text style={styles.sectionTitle}>Deduction Breakdown</Text>
              </View>

              {deductionDays.length === 0 ? (
                <Text style={styles.noDeductions}>
                  No deductions — full salary payable.
                </Text>
              ) : (
                <View style={styles.rowGroup}>
                  {deductionDays.map(day => (
                    <View key={day.date} style={styles.row}>
                      <Text style={styles.dedDate}>{formatDayLabel(day.date)}</Text>
                      <Text style={styles.dedLabel} numberOfLines={1}>
                        {day.label}
                      </Text>
                      <Text style={styles.dedAmount}>- {formatDays(day.deduct)} Day</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.leaveStats}>
                <Text style={styles.leaveStatsTitle}>Leave Balance Used</Text>
                <Text style={styles.leaveStatsText}>
                  Paid Leaves This Month: {formatDays(summary.paidLeave)}
                </Text>
                <Text style={styles.leaveStatsText}>
                  Unpaid (Quota Exceeded): {formatDays(summary.unpaidLeave)}
                </Text>
                <Text style={styles.leaveStatsText}>
                  Sandwich Penalties: {formatDays(summary.sandwichLeave)}
                </Text>
              </View>
            </View>

            <Text style={styles.footNote}>
              Note: Final salary payout is processed on the 1st of the next month and
              is subject to verified deductions.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>

      <AiAssistant />
    </View>
  );
};

export default MyPayrollScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06091a' },
  safeArea: { flex: 1 },
  loader: { marginTop: hp(6) },
  emptyText: {
    ...style.fontSizeSmall2x,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(6),
    paddingHorizontal: wp(8),
  },

  /* PIN gate */
  gateWrap: { flex: 1 },
  gateScroll: { flexGrow: 1, justifyContent: 'center', padding: wp(5) },
  gateCard: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(6),
    alignItems: 'center',
  },
  gateIcon: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(3.5),
    backgroundColor: 'rgba(155, 89, 182, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  gateTitle: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
    textAlign: 'center',
  },
  gateSubtitle: {
    ...style.fontSizeSmall1x,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    marginTop: hp(0.8),
    marginBottom: hp(2.4),
    lineHeight: hp(2.2),
  },
  gateInput: {
    width: '100%',
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    ...style.fontSizeNormal,
    color: darkTextPrimaryColor,
    marginBottom: hp(1.2),
  },
  gateError: {
    ...style.fontSizeSmall1x,
    color: RED,
    alignSelf: 'flex-start',
    marginBottom: hp(1),
  },
  gateButton: {
    width: '100%',
    backgroundColor: PURPLE,
    borderRadius: wp(3),
    paddingVertical: hp(1.6),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.6),
  },
  gateButtonDisabled: { opacity: 0.6 },
  gateButtonText: {
    ...style.fontSizeNormal,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  gateLinkWrap: { marginTop: hp(1.6) },
  gateLink: { ...style.fontSizeSmall1x, color: darkTextSecondaryColor },

  /* Payroll */
  topBar: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
    gap: hp(1.2),
  },
  subtitle: { ...style.fontSizeSmall1x, color: darkTextSecondaryColor },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },
  navDisabled: { opacity: 0.3 },
  monthLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  monthLabel: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(12),
    gap: hp(1.6),
  },
  banner: {
    borderRadius: wp(3),
    borderWidth: 1,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
  },
  bannerInfo: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  bannerInfoText: { ...style.fontSizeSmall1x, color: '#d9c7ea', lineHeight: hp(2.1) },
  bannerWarn: {
    backgroundColor: 'rgba(245, 197, 66, 0.1)',
    borderColor: 'rgba(245, 197, 66, 0.3)',
  },
  bannerWarnText: { ...style.fontSizeSmall1x, color: AMBER, lineHeight: hp(2.1) },
  card: {
    backgroundColor: darkSurfaceColor,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(4),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: wp(3) },
  headerLeft: { flex: 1, minWidth: 0 },
  name: {
    ...style.fontSizeNormal2x,
    ...style.fontWeightMedium1x,
    color: darkTextPrimaryColor,
  },
  role: { ...style.fontSizeSmall1x, color: '#c9a9e0', marginTop: hp(0.3) },
  netPayWrap: { alignItems: 'flex-end' },
  netPayLabel: {
    ...style.fontSizeExtraSmall,
    color: darkTextSecondaryColor,
    letterSpacing: 0.8,
  },
  netPayValue: {
    ...style.fontSizeLarge,
    ...style.fontWeightMedium1x,
    color: GREEN,
    marginTop: hp(0.2),
  },
  rowGroup: {
    marginTop: hp(1.8),
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowLabel: { ...style.fontSizeSmall2x, color: darkTextSecondaryColor },
  rowValue: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  rowValueWithIcon: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  salaryEditWrap: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: hp(1),
  },
  salaryEditRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  salaryInput: {
    flex: 1,
    backgroundColor: '#06091a',
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: darkBorderColor,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    ...style.fontSizeSmall2x,
    color: darkTextPrimaryColor,
  },
  salarySaveBtn: {
    backgroundColor: PURPLE,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.1),
  },
  salarySaveText: {
    ...style.fontSizeSmall1x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  salaryCancelBtn: { paddingHorizontal: wp(2), paddingVertical: hp(1.1) },
  salaryCancelText: { ...style.fontSizeSmall1x, color: darkTextSecondaryColor },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5) },
  sectionTitle: {
    ...style.fontSizeNormal1x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
  },
  noDeductions: {
    ...style.fontSizeSmall2x,
    color: GREEN,
    textAlign: 'center',
    marginTop: hp(1.8),
  },
  dedDate: { ...style.fontSizeSmall2x, color: darkTextPrimaryColor, width: wp(16) },
  dedLabel: { flex: 1, ...style.fontSizeSmall1x, color: '#f0a8a8', textAlign: 'center' },
  dedAmount: { ...style.fontSizeSmall2x, ...style.fontWeightMedium, color: RED },
  leaveStats: {
    marginTop: hp(1.8),
    backgroundColor: darkInputBgColor,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: darkBorderColor,
    padding: wp(3.5),
    gap: hp(0.5),
  },
  leaveStatsTitle: {
    ...style.fontSizeSmall2x,
    ...style.fontWeightMedium,
    color: darkTextPrimaryColor,
    marginBottom: hp(0.4),
  },
  leaveStatsText: { ...style.fontSizeSmall1x, color: darkTextSecondaryColor },
  footNote: {
    ...style.fontSizeSmall,
    color: darkTextSecondaryColor,
    textAlign: 'center',
    lineHeight: hp(2),
    paddingHorizontal: wp(2),
  },
});
