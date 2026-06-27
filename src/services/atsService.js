import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const ATS_VACANCIES = 'ats_vacancies';
const ATS_INTERVIEWS = 'ats_interviews';

// --- VACANCIES ---

export const fetchAllVacancies = async () => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase()
    .from(ATS_VACANCIES)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createVacancy = async (vacancyData) => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabase()
    .from(ATS_VACANCIES)
    .insert(vacancyData)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateVacancyStatus = async (id, status) => {
  if (!isSupabaseConfigured) return null;
  const updateData = { status };
  if (status === 'Closed') {
    updateData.closed_at = new Date().toISOString();
  }
  const { data, error } = await getSupabase()
    .from(ATS_VACANCIES)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- CANDIDATES (Interviews Table) ---

export const fetchCandidates = async () => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase()
    .from(ATS_INTERVIEWS)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addCandidate = async (candidateData) => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabase()
    .from(ATS_INTERVIEWS)
    .insert(candidateData)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCandidateStatus = async (id, status, interviewTime = null) => {
  if (!isSupabaseConfigured) return null;
  const updateData = { status };
  if (interviewTime) {
    updateData.interview_time = interviewTime;
  }
  const { data, error } = await getSupabase()
    .from(ATS_INTERVIEWS)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- DASHBOARD STATS ---

export const fetchAtsDashboardStats = async () => {
  if (!isSupabaseConfigured) {
    return {
      activeVacancies: 0,
      totalCandidates: 0,
      recentCandidates: [],
    };
  }
  
  const [vacanciesRes, candidatesRes] = await Promise.all([
    getSupabase().from(ATS_VACANCIES).select('id', { count: 'exact' }).eq('status', 'Open'),
    getSupabase().from(ATS_INTERVIEWS).select('id', { count: 'exact' }).neq('status', 'Rejected')
  ]);

  const { data: recent } = await getSupabase()
    .from(ATS_INTERVIEWS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    activeVacancies: vacanciesRes.count || 0,
    totalCandidates: candidatesRes.count || 0,
    recentCandidates: recent || [],
  };
};
