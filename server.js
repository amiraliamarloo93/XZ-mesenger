// server.js - XZ Messenger (complete local version)
const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// helper to load/save JSON
function loadJSON(fname, defaultValue) {
  const p = path.join(DATA_DIR, fname);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8") || "null") || defaultValue;
  } catch (e) {
    console.error("JSON load error", p, e);
    return defaultValue;
  }
}
function saveJSON(fname, data) {
  fs.writeFileSync(path.join(DATA_DIR, fname), JSON.stringify(data, null, 2));
}

let users = loadJSON("users.json", {});        // phone -> {firstName,lastName,phone,pin,avatar,url,settings}
let groups = loadJSON("groups.json", {});      // groupId -> {id,name,description,creator,members:[],messages:[],inviteToken}
let privateChats = loadJSON("privateChats.json", {}); // key -> [{user,msg,time}]
let otps = loadJSON("otps.json", {});          // phone -> {otp,expires,meta}

// static
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// make index available at /
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ---------- API: Auth/OTP ----------
function genOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
function nowPlusMinutes(m) {
  return Date.now() + m * 60 * 1000;
}

app.post("/api/signup", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: "شماره وارد نشده" });
  if (users[phone]) return res.json({ success: false, message: "این شماره قبلاً ثبت شده" });

  const otp = genOtp();
  otps[phone] = { otp, expires: nowPlusMinutes(10), meta: req.body };
  saveJSON("otps.json", otps);
  console.log(`[OTP] ${phone} -> ${otp}`);
  return res.json({ success: true, message: "کد OTP ساخته شد و در سرور ذخیره شد (برای تست اینجا چاپ می‌شود)", otp });
});

app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false });
  const record = otps[phone];
  if (!record) return res.json({ success: false, message: "کد تایید پیدا نشد" });
  if (Date.now() > record.expires) {
    delete otps[phone]; saveJSON("otps.json", otps);
    return res.json({ success: false, message: "کد منقضی شده" });
  }
  if (record.otp !== String(otp)) return res.json({ success: false, message: "کد اشتباه است" });

  // create user
  const { firstName = "", lastName = "", pin = "" } = record.meta;
  users[phone] = {
    firstName,
    lastName,
    phone,
    pin,
    avatar: null,
    settings: {
      theme: "auto",
      notifications: true,
      autoDeleteIfInactiveDays: 0
    }
  };
  delete otps[phone];
  saveJSON("users.json", users);
  saveJSON("otps.json", otps);
  return res.json({ success: true, message: "کاربر ساخته شد" });
});

app.post("/api/login", (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) return res.status(400).json({ success: false, message: "فیلدها کامل نیست" });
  const u = users[phone];
  if (!u) return res.json({ success: false, message: "کاربر یافت نشد" });
  if (u.pin !== pin) return res.json({ success: false, message: "رمز اشتباه است" });
  return res.json({ success: true, user: { phone: u.phone, firstName: u.firstName, lastName: u.lastName, avatar: u.avatar, settings: u.settings } });
});

// ---------- Groups / Channels ----------
function makeId(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

app.get("/api/groups", (req, res) => {
  // return summary
  const summary = {};
  for (const g in groups) {
    summary[g] = {
      id: groups[g].id,
      name: groups[g].name,
      description: groups[g].description,
      members: groups[g].members.length,
      online: groups[g].onlineCount || 0,
      creator: groups[g].creator
    };
  }
  res.json(summary);
});

app.post("/api/create-group", (req, res) => {
  const { name, description = "", creator } = req.body;
  if (!name || !creator) return res.status(400).json({ success: false, message: "نام و خالق لازم است" });
  const id = makeId("g_");
  const inviteToken = makeId("inv_");
  groups[id] = { id, name, description, creator, members: [creator], messages: [], inviteToken };
  saveJSON("groups.json", groups);
  return res.json({ success: true, id, inviteToken });
});

app.post("/api/delete-group", (req, res) => {
  const { id, requester } = req.body;
  if (!id || !groups[id]) return res.json({ success: false });
  if (groups[id].creator !== requester) return res.json({ success: false, message: "تنها سازنده می‌تواند حذف کند" });
  delete groups[id];
  saveJSON("groups.json", groups);
  return res.json({ success: true });
});

app.post("/api/join-by-invite", (req, res) => {
  const { token, phone } = req.body;
  for (const g in groups) {
    if (groups[g].inviteToken === token) {
      if (!groups[g].members.includes(phone)) groups[g].members.push(phone);
      saveJSON("groups.json", groups);
      return res.json({ success: true, group: groups[g] });
    }
  }
  return res.json({ success: false, message: "توکن نامعتبر" });
});

// search channels/users (public)
app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const found = { users: [], groups: [] };
  if (!q) return res.json(found);
  for (const p in users) {
    const u = users[p];
    if ((u.firstName + " " + u.lastName + " " + (u.phone || "")).toLowerCase().includes(q)) found.users.push({ phone: u.phone, firstName: u.firstName, lastName: u.lastName });
  }
  for (const g in groups) {
    if ((groups[g].name + " " + (groups[g].description || "")).toLowerCase().includes(q)) found.groups.push({ id: groups[g].id, name: groups[g].name });
  }
  res.json(found);
});

// admin: view OTPs (protected by pass)
app.post("/api/admin/otps", (req, res) => {
  const { pass } = req.body;
  if (pass !== "amarloo93") return res.status(403).json({ success: false });
  res.json(otps);
});

// profile update (simple avatar base64)
app.post("/api/profile/update", (req, res) => {
  const { phone, firstName, lastName, pin, avatarBase64 } = req.body;
  if (!phone || !users[phone]) return res.json({ success: false, message: "کاربر نیست" });
  if (firstName) users[phone].firstName = firstName;
  if (lastName) users[phone].lastName = lastName;
  if (pin) users[phone].pin = pin;
  if (avatarBase64) {
    const ext = avatarBase64.startsWith("data:image/png") ? "png" : "jpg";
    const filename = `${phone}_avatar.${ext}`;
    const filepath = path.join(__dirname, "data", filename);
    const base = avatarBase64.split(",")[1];
    fs.writeFileSync(filepath, Buffer.from(base, "base64"));
    users[phone].avatar = `/data/${filename}`; // served statically via a server route below
  }
  saveJSON("users.json", users);
  res.json({ success: true, user: users[phone] });
});

// serve files in data (avatars, voice) safely
app.use("/data", express.static(path.join(__dirname, "data")));

// ---------- WebSocket for messages ----------
wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", (raw) => {
    // messages are JSON: { type: 'group'|'private'|'voice', ... }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn("bad ws message", raw);
      return;
    }

    if (data.type === "group") {
      const g = groups[data.groupId];
      if (g) {
        const msg = { id: makeId("m_"), user: data.user, message: data.message, time: Date.now(), private: false };
        g.messages.push(msg);
        saveJSON("groups.json", groups);
        // broadcast to all
        const out = JSON.stringify({ type: "group", groupId: data.groupId, msg });
        wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(out); });
      }
    } else if (data.type === "private") {
      const key = [data.user, data.to].sort().join("-");
      if (!privateChats[key]) privateChats[key] = [];
      const msg = { id: makeId("m_"), user: data.user, message: data.message, time: Date.now(), private: true };
      privateChats[key].push(msg);
      saveJSON("privateChats.json", privateChats);
      const out = JSON.stringify({ type: "private", key, msg, user: data.user, to: data.to });
      wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(out); });
    } else if (data.type === "voice") {
      // voice: data.bytesBase64, user, to (groupId or phone), targetType: 'group'|'private'
      const filename = `${makeId("voice_")}.webm`;
      const filePath = path.join(__dirname, "data", filename);
      const base = data.bytesBase64.split(",")[1] || data.bytesBase64;
      fs.writeFileSync(filePath, Buffer.from(base, "base64"));
      if (data.targetType === "group" && groups[data.to]) {
        const msg = { id: makeId("m_"), user: data.user, voiceUrl: `/data/${filename}`, time: Date.now(), voice: true };
        groups[data.to].messages.push(msg);
        saveJSON("groups.json", groups);
        const out = JSON.stringify({ type: "group", groupId: data.to, msg });
        wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(out); });
      } else if (data.targetType === "private") {
        const key = [data.user, data.to].sort().join("-");
        if (!privateChats[key]) privateChats[key] = [];
        const msg = { id: makeId("m_"), user: data.user, voiceUrl: `/data/${filename}`, time: Date.now(), voice: true };
        privateChats[key].push(msg);
        saveJSON("privateChats.json", privateChats);
        const out = JSON.stringify({ type: "private", key, msg, user: data.user, to: data.to });
        wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(out); });
      }
    }
  });
});

// ping clients
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

// start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
