// Access control for Clock In / Out + Break tracking. Deliberately limited to a
// single user for now (pilot) — no other role or employee sees the clock card.
//
// To grant access to someone else, add their id (or email) to the lists below.
// Ids are matched first because they never change; email is the fallback.

// Sandeep singh — Team Leader, Development
export const CLOCK_TRACKING_USER_IDS = ['43148096-77ed-4181-a107-f9ef53ab5421'];

export const CLOCK_TRACKING_USER_EMAILS = ['sandeepsinghbase2brand@gmail.com'];

const normalize = value => String(value || '').trim().toLowerCase();

/** True only for users who have been granted clock tracking. */
export const canUseClockTracking = user => {
  if (!user) {
    return false;
  }

  const id = String(user.id || '').trim();
  if (id && CLOCK_TRACKING_USER_IDS.includes(id)) {
    return true;
  }

  const email = normalize(user.email);
  return Boolean(email) && CLOCK_TRACKING_USER_EMAILS.map(normalize).includes(email);
};
