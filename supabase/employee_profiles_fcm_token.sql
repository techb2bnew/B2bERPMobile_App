-- employee_profiles.fcm_token stores the latest device token per user.
-- Run only if the column does not exist yet.

alter table public.employee_profiles
  add column if not exists fcm_token text;

create index if not exists employee_profiles_fcm_token_idx
  on public.employee_profiles (fcm_token)
  where fcm_token is not null;
