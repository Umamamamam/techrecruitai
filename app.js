require('dotenv').config();
const express = require('express');
const path    = require('path');
const fetch = require('node-fetch');

const authRoutes    = require('./src/routes/auth.routes');
const studentRoutes = require('./src/routes/student.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Serve static files from /public ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/student', studentRoutes);

// ══════════════════════════════════════════════════════════════════════════════
//  AI PROXY ROUTES  — keeps API keys server-side, never exposed to browser
// ══════════════════════════════════════════════════════════════════════════════

// ── Helper: forward error details back to client ──────────────────────────────
function proxyError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

// ── 1. OpenRouter: Chat Completions (DeepSeek scoring) ───────────────────────
app.post('/api/proxy/openrouter/chat', async (req, res) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return proxyError(res, 500, 'OPENROUTER_API_KEY not set in .env');

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.SITE_URL || 'http://localhost:3000',
        'X-Title':       'Alliance CAN ATS',
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    if (!upstream.ok) return proxyError(res, upstream.status, data?.error?.message || 'OpenRouter error');
    res.json(data);
  } catch (err) {
    console.error('[proxy/chat]', err.message);
    proxyError(res, 502, 'Upstream request failed: ' + err.message);
  }
});

// ── 2. OpenRouter: Embeddings (Qwen3) ────────────────────────────────────────
app.post('/api/proxy/openrouter/embeddings', async (req, res) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return proxyError(res, 500, 'OPENROUTER_API_KEY not set in .env');

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.SITE_URL || 'http://localhost:3000',
        'X-Title':       'Alliance CAN ATS',
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    if (!upstream.ok) return proxyError(res, upstream.status, data?.error?.message || 'Embedding error');
    res.json(data);
  } catch (err) {
    console.error('[proxy/embeddings]', err.message);
    proxyError(res, 502, 'Upstream request failed: ' + err.message);
  }
});

// ── 3. OpenRouter: Rerank (Cohere) ───────────────────────────────────────────
app.post('/api/proxy/openrouter/rerank', async (req, res) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return proxyError(res, 500, 'OPENROUTER_API_KEY not set in .env');

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/rerank', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  process.env.SITE_URL || 'http://localhost:3000',
        'X-Title':       'Alliance CAN ATS',
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    if (!upstream.ok) return proxyError(res, upstream.status, data?.error?.message || 'Rerank error');
    res.json(data);
  } catch (err) {
    console.error('[proxy/rerank]', err.message);
    proxyError(res, 502, 'Upstream request failed: ' + err.message);
  }
});

// ── 4. LlamaParse: Upload URL ─────────────────────────────────────────────────
app.post('/api/proxy/llamaparse/upload', async (req, res) => {
  const key = process.env.LLAMAPARSE_KEY;
  if (!key) return proxyError(res, 500, 'LLAMAPARSE_KEY not set in .env');

  try {
    const upstream = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    if (!upstream.ok) return proxyError(res, upstream.status, data?.message || 'LlamaParse upload error');
    res.json(data);
  } catch (err) {
    console.error('[proxy/llamaparse/upload]', err.message);
    proxyError(res, 502, 'Upstream request failed: ' + err.message);
  }
});

// ── 5. LlamaParse: Job Status ─────────────────────────────────────────────────
app.get('/api/proxy/llamaparse/job/:jobId', async (req, res) => {
  const key = process.env.LLAMAPARSE_KEY;
  if (!key) return proxyError(res, 500, 'LLAMAPARSE_KEY not set in .env');

  try {
    const upstream = await fetch(
      `https://api.cloud.llamaindex.ai/api/parsing/job/${req.params.jobId}`,
      { headers: { 'Authorization': `Bearer ${key}` } }
    );

    const data = await upstream.json();
    if (!upstream.ok) return proxyError(res, upstream.status, data?.message || 'LlamaParse status error');
    res.json(data);
  } catch (err) {
    console.error('[proxy/llamaparse/job]', err.message);
    proxyError(res, 502, 'Upstream request failed: ' + err.message);
  }
});

// ── 6. LlamaParse: Job Result (markdown) ─────────────────────────────────────
app.get('/api/proxy/llamaparse/job/:jobId/result/markdown', async (req, res) => {
  const key = process.env.LLAMAPARSE_KEY;
  if (!key) return proxyError(res, 500, 'LLAMAPARSE_KEY not set in .env');

  try {
    const upstream = await fetch(
      `https://api.cloud.llamaindex.ai/api/parsing/job/${req.params.jobId}/result/markdown`,
      { headers: { 'Authorization': `Bearer ${key}` } }
    );

    const data = await upstream.json();
    if (!upstream.ok) return proxyError(res, upstream.status, data?.message || 'LlamaParse result error');
    res.json(data);
  } catch (err) {
    console.error('[proxy/llamaparse/result]', err.message);
    proxyError(res, 502, 'Upstream request failed: ' + err.message);
  }
});

// ── 7. Config endpoint — tells the frontend whether keys are available ────────
//    Returns { openrouter: true/false, llamaparse: true/false }
//    The frontend uses this instead of checking hardcoded keys.
app.get('/api/proxy/config', (req, res) => {
  res.json({
    openrouter: !!(process.env.OPENROUTER_API_KEY),
    llamaparse: !!(process.env.LLAMAPARSE_KEY),
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  Page Routes
// ══════════════════════════════════════════════════════════════════════════════
app.get('/',                           (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/index.html',                 (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login.html',                 (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register.html',              (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/oauth-success.html',         (req, res) => res.sendFile(path.join(__dirname, 'public', 'oauth-success.html')));
app.get('/student-registration.html',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'student-registration.html')));

// ─── 404 API ──────────────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// ─── 404 Pages ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});