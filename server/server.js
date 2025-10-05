// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_secret_for_prod';
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function initDb() {
  const db = await open({ filename: './db.sqlite', driver: sqlite3.Database });
  // users, messages, groups, group_members, contacts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE,
      name TEXT,
      password_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER,
      target_type TEXT, -- 'user' or 'group'
      target_id INTEGER,
      text TEXT,
      ts INTEGER
    );
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      owner_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER,
      user_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS contacts (
      owner_id INTEGER,
      contact_user_id INTEGER
    );
  `);
  return db;
}

const otpStore = new Map(); // phone -> {code, expiresAt}

function genOtp() {
  return String(Math.floor(1000 + Math.random()*9000));
}

function setOtpFor(phone) {
  const code = genOtp();
  const expiresAt = Date.now() + OTP_TTL_MS;
  otpStore.set(phone, { code, expiresAt });
  // auto cleanup
  setTimeout(()=> {
    const rec = otpStore.get(phone);
    if(rec && rec.expiresAt <= Date.now()) otpStore.delete(phone);
  }, OTP_TTL_MS + 1000);
  return code;
}

function verifyOtp(phone, code) {
  const rec = otpStore.get(phone);
  if(!rec) return false;
  if(rec.expiresAt < Date.now()) { otpStore.delete(phone); return false; }
  if(rec.code !== String(code)) return false;
  otpStore.delete(phone);
  return true;
}

// express app
(async () => {
  const db = await initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  // send OTP (server generates, you can hook SMS or Robika later)
  app.post('/api/send-otp', async (req, res) => {
    const { phone } = req.body;
    if(!phone) return res.status(400).json({ ok:false, error:'phone required' });
    const code = setOtpFor(phone);
    console.log('[OTP]', phone, code); // for dev: you see OTP in server log
    // TODO: integrate Robika API here to send code to user if you have chat_id
    return res.json({ ok:true, message:'otp_generated' });
  });

  // verify otp -> create or find user and return JWT
  app.post('/api/verify-otp', async (req, res) => {
    const { phone, code, name, password } = req.body;
    if(!phone || !code) return res.status(400).json({ ok:false, error:'phone & code required' });
    if(!verifyOtp(phone, code)) return res.status(400).json({ ok:false, error:'invalid_or_expired_otp' });

    // find user or create
    let user = await db.get('SELECT * FROM users WHERE phone = ?', phone);
    if(!user) {
      const password_hash = password ? await bcrypt.hash(password, 10) : null;
      const result = await db.run('INSERT INTO users (phone, name, password_hash) VALUES (?,?,?)', phone, name || null, password_hash);
      user = { id: result.lastID, phone, name: name || null };
    }
    // sign jwt
    const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn:'7d' });
    return res.json({ ok:true, token, user: { id:user.id, phone:user.phone, name:user.name }});
  });

  // authenticated middleware
  function authMiddleware(req,res,next){
    const auth = req.headers.authorization;
    if(!auth) return res.status(401).json({ ok:false, error:'no_token' });
    const parts = auth.split(' ');
    if(parts.length!==2) return res.status(401).json({ ok:false, error:'bad_auth' });
    const token = parts[1];
    try{
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    }catch(e){ return res.status(401).json({ ok:false, error:'invalid_token' }); }
  }

  // get my profile
  app.get('/api/me', authMiddleware, async (req,res)=>{
    const u = await db.get('SELECT id,phone,name FROM users WHERE id=?', req.user.userId);
    res.json({ ok:true, user:u });
  });

  // create group
  app.post('/api/groups', authMiddleware, async (req,res)=>{
    const { name, members } = req.body; // members = [userId,...]
    const r = await db.run('INSERT INTO groups (name, owner_id) VALUES (?,?)', name, req.user.userId);
    const groupId = r.lastID;
    // insert owner and members
    await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?,?)', groupId, req.user.userId);
    if(Array.isArray(members)){
      for(const m of members) await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?,?)', groupId, m);
    }
    res.json({ ok:true, groupId });
  });

  // list groups for me
  app.get('/api/groups', authMiddleware, async (req,res)=>{
    const rows = await db.all(`
      SELECT g.id,g.name,g.owner_id
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ?
    `, req.user.userId);
    res.json({ ok:true, groups: rows });
  });

  // add contact (simple)
  app.post('/api/contacts', authMiddleware, async (req,res)=>{
    const { contactUserId } = req.body;
    await db.run('INSERT INTO contacts (owner_id, contact_user_id) VALUES (?,?)', req.user.userId, contactUserId);
    res.json({ ok:true });
  });

  // list contacts
  app.get('/api/contacts', authMiddleware, async (req,res)=>{
    const rows = await db.all(`
      SELECT u.id,u.phone,u.name FROM contacts c
      JOIN users u ON u.id = c.contact_user_id
      WHERE c.owner_id = ?
    `, req.user.userId);
    res.json({ ok:true, contacts: rows });
  });

  // messages endpoint (history)
  app.get('/api/messages/:targetType/:targetId', authMiddleware, async (req,res)=>{
    const { targetType, targetId } = req.params; // targetType = user|group
    const rows = await db.all('SELECT * FROM messages WHERE target_type=? AND target_id=? ORDER BY ts ASC', targetType, targetId);
    res.json({ ok:true, messages: rows });
  });

  // create HTTP server & socket.io
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors:{ origin: "*" } });

  // socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('no token'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = payload;
      next();
    } catch (e) {
      next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    console.log('socket connected', userId);
    // join personal room
    socket.join(`user_${userId}`);

    // join group rooms after client asks
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    // send message
    socket.on('send_message', async (data) => {
      // data: { targetType: 'user'|'group', targetId, text }
      const ts = Date.now();
      await db.run('INSERT INTO messages (sender_id, target_type, target_id, text, ts) VALUES (?,?,?,?,?)', userId, data.targetType, data.targetId, data.text, ts);
      const msg = { sender_id:userId, target_type:data.targetType, target_id:data.targetId, text:data.text, ts };

      if(data.targetType === 'user'){
        // emit to receiver user room and to sender
        io.to(`user_${data.targetId}`).emit('message', msg);
        io.to(`user_${userId}`).emit('message', msg);
      } else {
        // group: emit to group room
        io.to(`group_${data.targetId}`).emit('message', msg);
      }
    });

    socket.on('disconnect', () => {
      console.log('socket disconnected', userId);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => console.log('Server listening on', PORT));
})();