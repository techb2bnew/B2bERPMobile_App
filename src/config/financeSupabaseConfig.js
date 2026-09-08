// 💰 Salary data does NOT live in the main Supabase project.
// The admin web app keeps salary in a separate "Finance / Invoicing" Supabase
// project, in the `employee_salaries` table (employee_id, salary, updated_at).
// The `employee_profiles.salary` column does not exist in the database at all.
//
// The admin app reads these two env vars:
//   VITE_SUPABASE_INVOICE_URL
//   VITE_SUPABASE_INVOICE_ANON_KEY
//
// 👇 Paste those same two values here to enable base salary and net pay in
//    My Payroll. While they are empty the screen shows "salary not set" —
//    everything else (payable days, leaves, deductions) still works.

export const FINANCE_SUPABASE_URL = 'https://qbyehcinzybxtptnzjpp.supabase.co';
export const FINANCE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieWVoY2luenlieHRwdG56anBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MzAyNDEsImV4cCI6MjEwNDAwNjI0MX0.g6csVEwbwIp19wUPko9QcwZl-yBIiToPoPnBfMfey2M';

export const EMPLOYEE_SALARIES_TABLE = 'employee_salaries';

export const isFinanceSupabaseConfigured = () => {
  const url = String(FINANCE_SUPABASE_URL || '').trim();
  const key = String(FINANCE_SUPABASE_ANON_KEY || '').trim();
  return /^https?:\/\/.+/i.test(url) && key.length > 20;
};
