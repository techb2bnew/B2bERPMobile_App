-- HRMS Module Database Migration
-- Run this in your Supabase SQL Editor to support HRMS payroll calculations.

-- 1. Add base_salary to employee_profiles table
alter table public.employee_profiles
  add column if not exists base_salary numeric default 0;

-- 2. Create indices for performance on frequent HRMS queries
create index if not exists clock_sessions_employee_id_date_idx 
  on public.clock_sessions(employee_id, clock_in);

create index if not exists leave_requests_employee_id_dates_idx 
  on public.leave_requests(employee_id, start_date, end_date);
