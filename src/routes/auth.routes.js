const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) return res.status(400).json({ success: false, message: error.message });

    const user = data.user;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, full_name: fullName, role: 'admin' });

    if (profileError) return res.status(400).json({ success: false, message: profileError.message });

    res.json({ success: true, message: `Thank you for registering, ${fullName}! Redirecting to login...` });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      message: 'Login successful.',
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || '',
        role: profile?.role || 'admin'
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── OAuth: Get Google URL ─────────────────────────────────────────────────────
router.get('/oauth/google', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.APP_URL}/oauth-success.html`
      }
    });

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.json({ success: true, url: data.url });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── OAuth: Get Microsoft URL ──────────────────────────────────────────────────
router.get('/oauth/microsoft', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${process.env.APP_URL}/oauth-success.html`,
        scopes: 'email profile openid'
      }
    });

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.json({ success: true, url: data.url });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── OAuth: Exchange session ───────────────────────────────────────────────────
router.post('/oauth/session', async (req, res) => {
  try {
    const { access_token, refresh_token, code } = req.body;

    let user = null;
    let sessionToken = null;

    // PKCE flow: exchange code for session
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data?.session) {
        return res.status(401).json({ success: false, message: 'Code exchange failed.' });
      }
      user         = data.session.user;
      sessionToken = data.session.access_token;
    }

    // Implicit flow: use access_token directly
    else if (access_token) {
      const { data: { user: u }, error } = await supabase.auth.getUser(access_token);
      if (error || !u) {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
      }
      user         = u;
      sessionToken = access_token;
    }

    else {
      return res.status(400).json({ success: false, message: 'No token or code provided.' });
    }

    // Get or create profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const fullName = user.user_metadata?.full_name
                    || user.user_metadata?.name
                    || user.email.split('@')[0];

      await supabase.from('profiles').insert({
        id: user.id,
        full_name: fullName,
        role: 'admin'
      });

      profile = { full_name: fullName, role: 'admin' };
    }

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id:        user.id,
        email:     user.email,
        full_name: profile.full_name,
        role:      profile.role
      }
    });

  } catch (error) {
    console.error('OAuth session error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;