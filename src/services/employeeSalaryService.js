/**
 * An employee's base salary, read from the Finance / Invoicing Supabase
 * project.
 *
 * From the admin web app's own comment (`database.ts`): "Salary is stored in
 * the isolated Finance/Invoicing Supabase project (employee_salaries), not on
 * employee_profiles — the employee_profiles.salary column is left in place but
 * no longer read from or written to."
 *
 * That is why the old mobile query against `employee_profiles.salary` always
 * failed (Postgres 42703, column does not exist) and base salary came back 0.
 */
import { createClient } from '@supabase/supabase-js';
import {
  EMPLOYEE_SALARIES_TABLE,
  FINANCE_SUPABASE_ANON_KEY,
  FINANCE_SUPABASE_URL,
  isFinanceSupabaseConfigured,
} from '../config/financeSupabaseConfig';

let financeClient = null;

const getFinanceSupabase = () => {
  if (!isFinanceSupabaseConfigured()) {
    return null;
  }

  if (!financeClient) {
    financeClient = createClient(
      String(FINANCE_SUPABASE_URL).trim(),
      String(FINANCE_SUPABASE_ANON_KEY).trim(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return financeClient;
};

export const isSalarySourceConfigured = isFinanceSupabaseConfigured;

/** "₹30,000" / "30000" -> 30000. Returns null if nothing parseable is found. */
export const parseSalaryText = raw => {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const digits = String(raw).replace(/[^0-9.]/g, '');
  if (!digits) {
    return null;
  }
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : null;
};

export const formatSalaryForStorage = amount =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;

/** @returns {Promise<number|null>} null when no salary is set, or the source is not configured */
export const fetchEmployeeSalary = async employeeId => {
  const supabase = getFinanceSupabase();
  if (!supabase || !employeeId) {
    return null;
  }

  const { data, error } = await supabase
    .from(EMPLOYEE_SALARIES_TABLE)
    .select('salary')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) {
    console.warn('fetchEmployeeSalary error:', error.message);
    return null;
  }

  return parseSalaryText(data?.salary);
};

/**
 * Every employee's salary in one call, as { [employeeId]: amount }.
 * Used by the HRMS/payroll aggregation so it does not have to make one
 * request per employee. Returns an empty object when the source is not
 * configured, which keeps callers working with a base salary of 0.
 */
export const fetchAllEmployeeSalaries = async () => {
  const supabase = getFinanceSupabase();
  if (!supabase) {
    return {};
  }

  const { data, error } = await supabase
    .from(EMPLOYEE_SALARIES_TABLE)
    .select('employee_id, salary');

  if (error) {
    console.warn('fetchAllEmployeeSalaries error:', error.message);
    return {};
  }

  const map = {};
  (data || []).forEach(row => {
    if (!row?.employee_id) {
      return;
    }
    map[row.employee_id] = parseSalaryText(row.salary) ?? 0;
  });

  return map;
};

export const setEmployeeSalary = async (employeeId, amount) => {
  const supabase = getFinanceSupabase();
  if (!supabase) {
    throw new Error(
      'Salary source is not configured — add the Finance project URL and anon key in src/config/financeSupabaseConfig.js.',
    );
  }
  if (!employeeId) {
    throw new Error('Employee id missing');
  }

  const { error } = await supabase.from(EMPLOYEE_SALARIES_TABLE).upsert(
    {
      employee_id: employeeId,
      salary: formatSalaryForStorage(amount),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) {
    throw new Error(error.message || 'Failed to save salary');
  }

  return true;
};
