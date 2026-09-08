/**
 * PIN lock for My Payroll — full parity with the admin web app's
 * `PayrollPinGate`. The hash goes into the same `payroll_pin_lock` table and
 * uses the same bcrypt algorithm, so a PIN set on the web works on mobile and
 * vice versa.
 */
import bcrypt from 'bcryptjs';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { signInWithEmail } from './authService';

const PAYROLL_PIN_TABLE = 'payroll_pin_lock';
const BCRYPT_ROUNDS = 10;

export const PAYROLL_PIN_MIN_LENGTH = 4;

/** The stored hash for this employee, or null if no PIN has been set. */
export const fetchPayrollPinHash = async employeeId => {
  if (!isSupabaseConfigured || !employeeId) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from(PAYROLL_PIN_TABLE)
    .select('password_hash')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) {
    console.warn('fetchPayrollPinHash error:', error.message);
    return null;
  }

  return data?.password_hash ?? null;
};

/** Save or reset the PIN. Only the bcrypt hash is stored, never the raw PIN. */
export const setPayrollPin = async (employeeId, pin) => {
  if (!isSupabaseConfigured || !employeeId) {
    throw new Error('Supabase is not configured');
  }

  const hash = await bcrypt.hash(String(pin), BCRYPT_ROUNDS);

  const { error } = await getSupabase()
    .from(PAYROLL_PIN_TABLE)
    .upsert({
      employee_id: employeeId,
      password_hash: hash,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message || 'Could not save your PIN');
  }

  return true;
};

/** The enter-PIN step. */
export const verifyPayrollPin = async (pin, storedHash) => {
  if (!storedHash) {
    return false;
  }
  try {
    return await bcrypt.compare(String(pin), storedHash);
  } catch (error) {
    console.warn('verifyPayrollPin error:', error?.message);
    return false;
  }
};

/**
 * "Forgot PIN?" — confirm identity with the user's own ERP login password.
 * The admin app does the same thing (re-verifying via signInWithPassword).
 */
export const verifyAccountPassword = async (email, password) => {
  if (!email) {
    throw new Error("Your account email isn't available — please reload and try again.");
  }

  try {
    await signInWithEmail(email, password);
    return true;
  } catch {
    return false;
  }
};
