const express   = require('express');
const supabase  = require('../config/supabase');

const router = express.Router();

// ─── Submit / Upsert Student Registration ────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.usn || !payload.full_name) {
      return res.status(400).json({ success: false, message: 'USN and full name are required.' });
    }

    // Check if student already exists by USN
    const { data: existing } = await supabase
      .from('student_registrations')
      .select('id')
      .eq('usn', payload.usn)
      .single();

    // If exists, delete it first
    if (existing) {
      await supabase
        .from('student_registrations')
        .delete()
        .eq('usn', payload.usn);
    }

    // Insert fresh
    const { error } = await supabase
      .from('student_registrations')
      .insert(payload);

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.json({
      success: true,
      message: `Registration successful for ${payload.full_name}!`,
      updated: !!existing // true if it replaced an old record
    });

  } catch (err) {
    console.error('Student registration error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── Get student by USN (optional, for admin dashboard) ──────────────────────
router.get('/:usn', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_registrations')
      .select('*')
      .eq('usn', req.params.usn)
      .single();

    if (error || !data) return res.status(404).json({ success: false, message: 'Student not found.' });

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;