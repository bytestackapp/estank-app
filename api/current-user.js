const { getSupabase, requireAuth } = require('../lib/supabase');
module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from('users')
    .select('username, first_name, last_name, email, role, plan, trial_expires_at, plan_expires_at')
    .eq('auth_id', user.id).single();
  if (profile) {
    let isExpired = false;
    if (profile.plan === 'trial' && profile.trial_expires_at) {
      isExpired = new Date(profile.trial_expires_at) < new Date();
    }
    return res.json({
      username: profile.username, firstName: profile.first_name || null,
      lastName: profile.last_name || null, email: profile.email || null,
      role: profile.role || 'user', plan: profile.plan || 'paid',
      trialExpiresAt: profile.trial_expires_at || null, isExpired,
    });
  }
  return res.json({ username: null, role: null });
};
