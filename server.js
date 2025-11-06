// server.js - XZ Messenger (secure auth + admin + TOTP sample)
// WARNING: For production use HTTPS + secure session store (Redis). Use env vars for secrets.

const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const { v4: uuidv4 } = require('uuid');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const winston = require('winston');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Logger ---------- */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [ new winston.transports.Console() ]
});

/* ---------- Middleware ---------- */
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session config - in-memory store for dev. Replace with RedisStore in prod.
app.use(session({
  name: 'xz.sid',
  secret: process.env.SESSION_SECRET || 'replace_this_with_env_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in prod
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// CSRF protection (state-changing routes). Expose token via /csrf-token for front-end.
const csrfProtection = csurf({ cookie: false }); // we use sessions
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
});

/* ---------- Rate limiting ---------- */
// Global gentle limiter
const limiter = rateLimit({
  windowMs: 1000 * 60, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8, // max attempts per IP in window
  message: { success:false, message: "Too many attempts, try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

/* ---------- In-memory "DB" (replace with real DB) ---------- */
let users = {};       // { phone: { firstName, lastName, passwordHash, roles:[], lockedUntil:timestamp, failedLoginCount, totpSecret } }
let groups = {};      // keep existing groups object or connect to DB
let otps = {};        // { phone: { otp, createdAt } }  // you asked OTP to be stored server-side

// Seed admin user (username=amirali, password='amarloo93' as requested)
// NOTE: In production, create admin via secure CLI or migration. This seed only if admin missing.
(async function seedAdmin(){
  const adminPhone = 'admin';
  if(!users[adminPhone]){
    const pw = 'amarloo93';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(pw, salt);
    users[adminPhone] = {
      firstName: 'امیرعلی',
      lastName: 'عمارلو',
      passwordHash: hash,
      roles: ['admin'],
      failedLoginCount: 0,
      lockedUntil: 0
      // totpSecret: optional
    };
    logger.info('Admin seeded as user "admin" (phone=admin). Change immediately in production!');
  }
})();

/* ---------- Helpers ---------- */
function isAuthenticated(req){
  return req.session && req.session.user;
}
function isAdmin(req){
  return isAuthenticated(req) && req.session.user && req.session.user.roles && req.session.user.roles.includes('admin');
}

// sanitize basic phone
function normalizePhone(p){ return String(p || '').replace(/\s+/g,'').replace(/\D/g,''); }

/* ---------- Auth endpoints ---------- */

// Register -> generate OTP, save to otps object (server-side) and optionally return to dev/admin console
app.post('/register', authLimiter, (req, res) => {
  try {
    const { phone, firstName, lastName, pin } = req.body;
    if(!phone || !pin) return res.status(400).json({ success:false, message:'phone and pin required' });
    if(typeof pin !== 'string' || pin.length !== 4) return res.status(400).json({ success:false, message:'pin must be 4 characters' });
    const p = normalizePhone(phone);
    if(users[p]) return res.status(400).json({ success:false, message:'user exists' });

    // store OTP server-side (do NOT send SMS); for dev we return it in response for convenience
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otps[p] = { otp, createdAt: Date.now(), requester: req.ip };
    // temporarily save user data in otps store so verify-otp can create the account
    otps[p].pending = { firstName: validator.escape(firstName||''), lastName: validator.escape(lastName||''), pin };

    logger.info('OTP generated for ' + p + ' from ' + req.ip);
    // In production, DO NOT return OTP to client. Here we return so you can test easily.
    return res.json({ success:true, otp }); 
  } catch(err){
    logger.error(err);
    return res.status(500).json({ success:false, message:'server error' });
  }
});

// Verify OTP -> create user
app.post('/verify-otp', (req,res) => {
  try {
    const { phone, otp } = req.body;
    const p = normalizePhone(phone);
    if(!otps[p]) return res.json({ success:false, message:'no otp found for phone' });
    if(otps[p].otp !== String(otp)) return res.json({ success:false, message:'wrong otp' });
    // check expiry (e.g., 10 minutes)
    if(Date.now() - otps[p].createdAt > 10 * 60 * 1000) { delete otps[p]; return res.json({ success:false, message:'otp expired' }); }
    const pending = otps[p].pending;
    if(!pending) { delete otps[p]; return res.json({ success:false, message:'inconsistent data' }); }

    // create user
    bcrypt.genSalt(10, (e,salt)=>{
      bcrypt.hash(pending.pin, salt, (err,hash)=>{
        if(err){ logger.error(err); return res.status(500).json({ success:false }); }
        users[p] = {
          firstName: pending.firstName,
          lastName: pending.lastName,
          passwordHash: hash,
          roles: ['user'],
          failedLoginCount: 0,
          lockedUntil: 0
        };
        delete otps[p];
        logger.info('User created: ' + p);
        return res.json({ success:true });
      });
    });
  } catch(err){
    logger.error(err);
    return res.status(500).json({ success:false, message:'server error' });
  }
});

// Login (phone + pin) - with rate limit and account lock
app.post('/login', authLimiter, async (req,res) => {
  try {
    const { phone, pin } = req.body;
    const p = normalizePhone(phone);
    const user = users[p];
    if(!user) return res.json({ success:false, message:'user not found' });

    // account lock check
    if(user.lockedUntil && Date.now() < user.lockedUntil) {
      return res.status(429).json({ success:false, message:'account temporarily locked due to repeated failures' });
    }

    const match = await bcrypt.compare(pin, user.passwordHash);
    if(!match){
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      // lock after 5 failed attempts for 15 minutes
      if(user.failedLoginCount >= 5){
        user.lockedUntil = Date.now() + 15 * 60 * 1000;
        user.failedLoginCount = 0; // reset
        logger.warn(`Account ${p} locked due to failed attempts`);
        return res.status(429).json({ success:false, message:'account locked temporarily' });
      }
      logger.info(`Failed login attempt for ${p}`);
      return res.json({ success:false, message:'invalid credentials' });
    }

    // success -> reset counters
    user.failedLoginCount = 0;
    user.lockedUntil = 0;

    // If user has TOTP enabled, require check (we'll provide separate endpoint)
    if(user.totpSecret){
      // set a temporary session flag and ask for TOTP verification
      req.session.pending2fa = { phone: p };
      return res.json({ success:true, requires2fa:true, message:'2FA required' });
    }

    // set session
    req.session.user = { phone: p, firstName: user.firstName, roles: user.roles || [] };
    logger.info(`User logged in: ${p}`);
    return res.json({ success:true });
  } catch(err){
    logger.error(err);
    return res.status(500).json({ success:false, message:'server error' });
  }
});

// 2FA verify endpoint (TOTP)
app.post('/verify-2fa', (req,res)=>{
  try {
    const { token } = req.body;
    const pending = req.session.pending2fa;
    if(!pending) return res.json({ success:false, message:'no 2fa pending' });
    const user = users[pending.phone];
    if(!user || !user.totpSecret) return res.json({ success:false, message:'invalid 2fa' });

    const verified = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token, window:1 });
    if(!verified) return res.json({ success:false, message:'invalid token' });

    // set session
    req.session.user = { phone: pending.phone, firstName: user.firstName, roles: user.roles || [] };
    delete req.session.pending2fa;
    logger.info('2FA success for ' + pending.phone);
    return res.json({ success:true });
  } catch(err){
    logger.error(err);
    return res.status(500).json({ success:false });
  }
});

// Logout
app.post('/logout', (req,res)=>{
  req.session.destroy(()=> res.json({ success:true }));
});

/* ---------- Admin protected route example ---------- */
function ensureAuth(req,res,next){
  if(!isAuthenticated(req)) return res.status(401).json({ success:false, message:'not authenticated' });
  next();
}
function ensureAdmin(req,res,next){
  if(!isAdmin(req)) return res.status(403).json({ success:false, message:'forbidden' });
  next();
}

app.get('/admin/users', ensureAdmin, (req,res)=>{
  // return list of users (sanitized)
  const out = Object.entries(users).map(([phone,u])=>({
    phone, firstName: u.firstName, lastName: u.lastName, roles: u.roles, lockedUntil: u.lockedUntil || null
  }));
  res.json({ success:true, users: out });
});

/* ---------- TOTP setup endpoints (user uses authenticator app) ---------- */
app.post('/setup-2fa', ensureAuth, (req,res)=>{
  const phone = req.session.user.phone;
  const secret = speakeasy.generateSecret({ name: `XZ Messenger (${phone})` });
  // save temp secret to session until verified
  req.session.totpTemp = secret.base32;
  qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if(err){ logger.error(err); return res.status(500).json({ success:false }); }
    return res.json({ success:true, qr: data_url, secret: secret.base32 });
  });
});
app.post('/confirm-2fa', ensureAuth, (req,res)=>{
  const { token } = req.body;
  const phone = req.session.user.phone;
  const temp = req.session.totpTemp;
  if(!temp) return res.json({ success:false, message:'setup not initiated' });
  const ok = speakeasy.totp.verify({ secret: temp, encoding: 'base32', token, window:1 });
  if(!ok) return res.json({ success:false, message:'invalid token' });
  users[phone].totpSecret = temp; delete req.session.totpTemp;
  return res.json({ success:true });
});

/* ---------- CSRF-protected route example (attach csurf middleware where needed) ---------- */
app.post('/profile/update', csrfProtection, ensureAuth, (req,res) => {
  const phone = req.session.user.phone;
  const { firstName, lastName, pin } = req.body;
  if(pin && pin.length !== 4) return res.status(400).json({ success:false, message:'pin must be 4 chars' });
  users[phone].firstName = validator.escape(firstName || users[phone].firstName);
  users[phone].lastName = validator.escape(lastName || users[phone].lastName);
  if(pin){
    bcrypt.hash(pin, 10, (err,hash)=>{ users[phone].passwordHash = hash; });
  }
  return res.json({ success:true });
});

/* ---------- Endpoint to view server-stored OTPs (admin only) ---------- */
app.get('/admin/otps', ensureAdmin, (req,res)=>{
  // Danger: keep this admin-only. In production, consider encryption and retention policy.
  res.json({ success:true, otps });
});

/* ---------- Static files: serve public/ (make sure index.html exists inside public) ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Fallback / health ---------- */
app.get('/health', (req,res) => res.json({ ok: true }));

/* ---------- Start server ---------- */
app.listen(PORT, () => {
  logger.info(`Secure XZ server listening on http://localhost:${PORT}`);
});
