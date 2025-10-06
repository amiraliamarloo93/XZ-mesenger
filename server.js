// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const notifier = require('node-notifier');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// data folder & helper
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || '{}'); }
  catch(e) { return {}; }
}
function writeJSON(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

let users = readJSON(USERS_FILE);       // { phone: {firstName,lastName,pin} }
let groups = readJSON(GROUPS_FILE);     // { groupName: {description, members:[], admin} }
let messages = readJSON(MESSAGES_FILE); // { groupName: [{id,user,message,time,type,extra}], 'private:user1-user2': [...] }

function persistAll() {
  writeJSON(USERS_FILE, users);
  writeJSON(GROUPS_FILE, groups);
  writeJSON(MESSAGES_FILE, messages);
}

// --- REST API ---

// Register: create OTP and return it (for dev/testing). In production, send via real SMS.
let otps = {}; // { phone: { otp, firstName, lastName, pin, expiresAt } }

app.post('/register', (req, res) => {
  const { phone, firstName, lastName, pin } = req.body;
  if (!phone || !pin || pin.toString().length !== 4) return res.status(400).json({ success: false, message: 'phone and 4-digit pin required' });
  if (users[phone]) return res.json({ success: false, message: 'کاربر قبلاً ثبت شده' });

  const otp = Math.floor(1000 + Math.random()*9000);
  otps[phone] = { otp, firstName: firstName || '', lastName: lastName || '', pin, expiresAt: Date.now() + 1000*60*5 };
  // optional: desktop notification
  try {
    notifier.notify({ title: 'XZ Messenger - OTP', message: `کد شما: ${otp}` });
  } catch(e) {}
  return res.json({ success: true, otp });
});

app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const rec = otps[phone];
  if (!rec) return res.json({ success: false, message: 'کدی ارسال نشده' });
  if (Date.now() > rec.expiresAt) { delete otps[phone]; return res.json({ success: false, message: 'کد منقضی شد' }); }
  if (rec.otp.toString() !== otp.toString()) return res.json({ success: false, message: 'کد اشتباه است' });

  // create user
  users[phone] = { firstName: rec.firstName, lastName: rec.lastName, pin: rec.pin };
  persistAll();
  delete otps[phone];
  return res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { phone, pin } = req.body;
  if (users[phone] && users[phone].pin.toString() === pin.toString()) return res.json({ success: true, user: users[phone] });
  return res.json({ success: false, message: 'شماره یا رمز اشتباه است' });
});

// profile update
app.post('/update-profile', (req, res) => {
  const { phone, firstName, lastName, pin } = req.body;
  if (!users[phone]) return res.json({ success: false, message: 'کاربر یافت نشد' });
  users[phone].firstName = firstName || users[phone].firstName;
  users[phone].lastName = lastName || users[phone].lastName;
  if (pin && pin.toString().length===4) users[phone].pin = pin;
  persistAll();
  res.json({ success: true });
});

// groups
app.get('/groups', (req,res) => res.json(groups));

app.post('/create-group', (req,res) => {
  const { groupName, description, creatorPhone } = req.body;
  if(!groupName || !creatorPhone) return res.status(400).json({ success:false, message:'نام گروه و شماره سازنده لازم است' });
  if(groups[groupName]) return res.json({ success:false, message:'گروه قبلا موجود است' });
  groups[groupName] = { description: description||'', members: [creatorPhone], admin: creatorPhone };
  messages[groupName] = [];
  persistAll();
  res.json({ success:true });
});

app.post('/delete-group', (req,res) => {
  const { groupName, requester } = req.body;
  if(!groups[groupName]) return res.json({ success:false, message:'گروه وجود ندارد' });
  // only admin can delete
  if(groups[groupName].admin !== requester) return res.json({ success:false, message:'فقط ادمین می‌تواند حذف کند' });
  delete groups[groupName];
  delete messages[groupName];
  persistAll();
  res.json({ success:true });
});

app.get('/messages/:target', (req,res) => {
  const t = req.params.target;
  res.json(messages[t] || []);
});

// serve index at root guaranteed
app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- WebSocket ---
// message format (JSON):
// { type: 'group', group: 'گروه تست', user: phone, message: 'text', time?:..., extra?: {} }
// { type: 'private', user: phone, to: otherPhone, message: 'text' }
// { type: 'voice', user: phone, group: 'گروه', id: 'uuid', blobMeta: {size, mime} }  // voice upload sequence
// For binary voice data, we'll accept a special binary frame with a small header

// we'll keep a map of ws -> phone (when client sends an 'identify' message)
const wsClients = new Map();

wss.on('connection', (ws) => {
  ws.id = uuidv4();

  ws.on('message', (data) => {
    // detect whether data is Buffer (binary) or string (JSON)
    if (typeof data !== 'string') {
      // binary message: treat as voice chunk upload, we expect the client to send a small JSON header first announcing voice id
      // For simplicity: clients send full voice file in one binary message with a query param: ws.send(binary, {binary:true})
      // We'll broadcast as voice URL via base64 (not ideal for big files). For production use upload to S3 or file storage.
      try {
        const b64 = data.toString('base64');
        // we can't know meta here; assume lastVoiceMeta saved on ws
        if (ws._pendingVoice && ws._pendingVoice.group) {
          const id = ws._pendingVoice.id;
          const group = ws._pendingVoice.group;
          const user = ws._pendingVoice.user;
          // store as message with data URI
          const mime = ws._pendingVoice.mime || 'audio/webm';
          const uri = `data:${mime};base64,${b64}`;
          const msg = { id, user, message: '[Voice]', time: new Date().toLocaleString(), type: 'voice', uri };
          if (!messages[group]) messages[group] = [];
          messages[group].push(msg);
          persistAll();
          // broadcast to all
          const payload = { type: 'voice', group, chatMsg: msg };
          wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(JSON.stringify(payload)));
          delete ws._pendingVoice;
        }
      } catch(e) { console.error('binary handling error', e); }
      return;
    }

    let d;
    try { d = JSON.parse(data); } catch(err){ console.error('invalid json', err); return; }

    // identification
    if (d.type === 'identify') {
      wsClients.set(ws, d.user);
      ws.user = d.user;
      return;
    }

    if (d.type === 'group') {
      const { group, user, message: msgText } = d;
      const chatMsg = { id: uuidv4(), user, message: msgText, time: new Date().toLocaleString(), type: 'text' };
      if (!messages[group]) messages[group] = [];
      messages[group].push(chatMsg);
      persistAll();
      // broadcast
      const payload = { type: 'group', group, chatMsg };
      wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(payload)); });
      return;
    }

    if (d.type === 'private') {
      const { user, to, message: msgText } = d;
      const key = [user, to].sort().join('-');
      const chatMsg = { id: uuidv4(), user, message: msgText, time: new Date().toLocaleString(), type: 'text' };
      if (!messages[`private:${key}`]) messages[`private:${key}`] = [];
      messages[`private:${key}`].push(chatMsg);
      persistAll();
      const payload = { type: 'private', to, chatMsg };
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(payload));
        }
      });
      return;
    }

    if (d.type === 'voice-announce') {
      // client will then send binary frame; we store meta on ws
      ws._pendingVoice = { id: d.id || uuidv4(), group: d.group, user: d.user, mime: d.mime || 'audio/webm' };
      return;
    }

    // other message types...
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
