const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
let nodemailer;
// #region agent log
const DEBUG_LOG_PATH = path.join(__dirname, '..', '.cursor', 'debug.log');
function debugLog(payload) {
  try {
    const entry = JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) + '\n';
    fs.appendFileSync(DEBUG_LOG_PATH, entry, 'utf8');
  } catch {}
}
// #endregion
try {
  // Optional dependency; if not installed, we'll log codes to console in dev.
  // eslint-disable-next-line global-require
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

const { openDB, migrate, nowIso } = require('./db.cjs');
const { requireAuth, requireAdmin } = require('./middleware.cjs');

const DOTENV_PATH = process.env.DOTENV_PATH || path.join(__dirname, '.env.local.api');
const result = dotenv.config({ path: DOTENV_PATH });
if (result.error) {
  console.error('[api] dotenv 加载错误:', result.error);
}

/**
 * dotenv treats `#` as a comment starter in unquoted values. If a password
 * contains `#` and isn't quoted, it will be truncated.
 *
 * To make admin setup robust, we additionally parse the raw env file line and
 * override process.env.ADMIN_PASSWORD if present.
 */
function loadAdminPasswordFromEnvFile(envPath) {
  try {
    const abs = path.isAbsolute(envPath) ? envPath : path.join(__dirname, envPath);
    if (!fs.existsSync(abs)) return null;
    const raw = fs.readFileSync(abs, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = String(line || '').trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (!trimmed.startsWith('ADMIN_PASSWORD=')) continue;
      const rhs = trimmed.slice('ADMIN_PASSWORD='.length);
      const m = rhs.match(/^"(.*)"$/) || rhs.match(/^'(.*)'$/);
      return m ? m[1] : rhs;
    }
    return null;
  } catch {
    return null;
  }
}

const rawAdminPw = loadAdminPasswordFromEnvFile(DOTENV_PATH);
if (rawAdminPw) process.env.ADMIN_PASSWORD = rawAdminPw;

// 确保 JWT_SECRET 被正确设置（从 dotenv 解析结果中）
if (result.parsed && result.parsed.JWT_SECRET && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = result.parsed.JWT_SECRET;
}

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('[api] 缺少环境变量 JWT_SECRET。请参考 api/env.example');
  process.exit(1);
}

const SITE_NAME = process.env.SITE_NAME || 'aitocg.cn';
const PORT = Number(process.env.PORT || 8787);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://www.aitocg.cn';

const db = openDB();
migrate(db);

function hashPassword(password, salt) {
  // PBKDF2: 100k iterations, 64-byte key, sha512
  return crypto.pbkdf2Sync(String(password), String(salt), 100000, 64, 'sha512').toString('hex');
}

function hashVerifyCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateInviteCode10() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/1/O/I for readability
  let out = '';
  for (let i = 0; i < 10; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function generateEmailCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getUserIdFromRequest(req) {
  if (!req.user || !req.user.sub) return null;
  const id = Number(req.user.sub);
  if (!id || Number.isNaN(id)) return null;
  return id;
}

async function sendVerificationEmail(toEmail, code) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  // Dev fallback: no SMTP configured.
  if (!host || !user || !pass || !from || !nodemailer) {
    // eslint-disable-next-line no-console
    console.log(`[api] 邮箱验证码（开发模式输出，不会真实发送） to=${toEmail} code=${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `[${SITE_NAME}] 您的邮箱验证码`,
    text: `您好，

您的邮箱验证码是：${code}

请在 ${SITE_NAME} 网站中输入此验证码完成注册。此验证码有效期为 10 分钟。

如果您未请求此验证码，请忽略此邮件。

此致，
${SITE_NAME} 团队`,
  });
}

function issueToken(user) {
  return jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const app = express();
app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser tools / same-origin
      if (!origin) return cb(null, true);
      try {
        // If explicitly configured, allow it.
        if (CORS_ORIGIN === '*' || origin === CORS_ORIGIN) return cb(null, true);

        // Dev convenience: allow Vite ports (5170-5199)
        if (/^http:\/\/localhost:51\d{2}$/.test(origin)) return cb(null, true);

        // Allow local LAN Vite access (192.168.x.x, 172.x.x.x, 10.x.x.x)
        if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:51\d{2}$/.test(origin)) return cb(null, true);
        if (/^http:\/\/172\.\d{1,3}\.\d{1,3}\.\d{1,3}:51\d{2}$/.test(origin)) return cb(null, true);
        if (/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:51\d{2}$/.test(origin)) return cb(null, true);
      } catch {
        // ignore
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Auth ---
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'BAD_REQUEST' });

    const user = db
      .prepare('SELECT id, username, password_hash, salt, role, disabled FROM users WHERE username = ?')
      .get(String(username).trim());

    if (!user || user.disabled) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    if (!user.salt) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    const hashedPassword = hashPassword(password, user.salt);
    const ok = hashedPassword === user.password_hash;
    if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowIso(), user.id);
    const token = issueToken(user);
    return res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api] /api/auth/login error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const id = Number(req.user.sub);
  const user = db.prepare('SELECT username, role, disabled FROM users WHERE id = ?').get(id);
  if (!user || user.disabled) return res.status(401).json({ error: 'UNAUTHORIZED' });
  return res.json({ user: { username: user.username, role: user.role } });
});

// Global error handler middleware (must be after all routes)
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('[api] Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${PORT} (CORS: ${CORS_ORIGIN})`);
});


