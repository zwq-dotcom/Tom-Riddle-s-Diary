const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'diary_secret_key';
const COOKIE_NAME = 'diary_session';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function setSessionCookie(res, data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = sign(payload);
  res.cookie(COOKIE_NAME, payload + '.' + sig, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function sessionMiddleware(req, res, next) {
  req.session = null;
  const header = req.headers.cookie;
  if (header) {
    const part = header.split('; ').find(c => c.indexOf(COOKIE_NAME + '=') === 0);
    if (part) {
      const value = part.slice(COOKIE_NAME.length + 1);
      const dot = value.lastIndexOf('.');
      if (dot > 0) {
        const payload = value.slice(0, dot);
        const sig = value.slice(dot + 1);
        const expected = sign(payload);
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
          try {
            req.session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
          } catch (e) { /* invalid cookie */ }
        }
      }
    }
  }
  next();
}

module.exports = { sessionMiddleware, setSessionCookie, clearSessionCookie };
