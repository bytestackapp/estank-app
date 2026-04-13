const { clearTokenCookie } = require('../lib/supabase');

module.exports = function handler(req, res) {
  clearTokenCookie(res);
  res.redirect('/login');
};
