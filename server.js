// server.js
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// In-memory storage (for local/demo). Replace with DB for production.
let users = {}; // phone -> { firstName, lastName, pin }
let pendingOtps = {}; // phone -> { otp, createdAt, pin, firstName, lastName }
let groups = {}; // groupName -> { description, members: [phone], messages: [{user,message,time,type}] }
let privateChats = {}; // key phone-phone -> [{user,message,time,type}] 

// helper
function nowTime() { return new Date().toLocaleString(); }

// ---------- API: register -> generate OTP (do NOT return OTP to client) ----------
app.post("/api/register", (req, res) => {
  const { phone, firstName, lastName, pin } = req.body || {};
  // validations
  if (!phone || typeof phone !== "string" || phone.trim().length < 5) {
    return res.status(400).json({ success: false, message: "شماره موبایل معتبر نیست" });
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ success: false, message: "رمز باید ۴ رقم باشد" });
  }
  if (users[phone]) {
    return res.status(400).json({ success: false, message: "شماره قبلا ثبت شده" });
  }
  const otp = Math.floor(1000 + Math.random() * 9000);
  pendingOtps[phone] = { otp, createdAt: Date.now(), pin, firstName, lastName };
  // **Important**: do NOT return OTP to client. We log it on server console (for admin).
  console.log("=== OTP GENERATED ===");
  console.log(`Phone: ${phone}`);
  console.log(`OTP: ${otp}`);
  console.log(`Time: ${nowTime()}`);
  console.log("=====================");
  return res.json({ success: true, message: "کد تایید تولید شد. آن را از پنل سرور بررسی کنید." });
});

// ---------- API: verify OTP ----------
app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ success: false });
  const record = pendingOtps[phone];
  if (!record) return res.status(400).json({ success: false, message: "کدی برای این شماره ثبت نشده" });
  if (String(record.otp) !== String(otp)) return res.status(400).json({ success: false, message: "کد اشتباه است" });
  // create user
  users[phone] = { firstName: record.firstName || "", lastName: record.lastName || "", pin: record.pin };
  delete pendingOtps[phone];
  return res.json({ success: true });
});

// ---------- API: login ----------
app.post("/api/login", (req, res) => {
  const { phone, pin } = req.body || {};
  if (!phone || !pin) return res.status(400).json({ success: false, message: "شماره و رمز لازم است" });
  const u = users[phone];
  if (!u) return res.status(400).json({ success: false, message: "کاربر یافت نشد" });
  if (u.pin !== pin) return res.status(400).json({ success: false, message: "رمز اشتباه است" });
  return res.json({ success: true, firstName: u.firstName, lastName: u.lastName });
});

// ---------- API: profile update ----------
app.post("/api/update-profile", (req, res) => {
  const { phone, firstName, lastName, pin } = req.body || {};
  if (!phone || !users[phone]) return res.status(400).json({ success: false, message: "کاربر یافت نشد" });
  if (pin && !/^\d{4}$/.test(pin)) return res.status(400).json({ success: false, message: "رمز باید ۴ رقم باشد" });
  users[phone].firstName = firstName || users[phone].firstName;
  users[phone].lastName = lastName || users[phone].lastName;
  if (pin) users[phone].pin = pin;
  return res.json({ success: true });
});

// ---------- API: groups CRUD ----------
app.get("/api/groups", (req, res) => {
  return res.json(groups);
});

app.post("/api/create-group", (req, res) => {
  const { groupName, description, creatorPhone } = req.body || {};
  if (!groupName) return res.status(400).json({ success: false, message: "نام گروه الزامی است" });
  if (groups[groupName]) return res.status(400).json({ success: false, message: "گروه قبلا وجود دارد" });
  groups[groupName] = { description: description || "", members: creatorPhone ? [creatorPhone] : [], messages: [] };
  return res.json({ success: true });
});

app.post("/api/delete-group", (req, res) => {
  const { groupName } = req.body || {};
  if (groups[groupName]) delete groups[groupName];
  return res.json({ success: true });
});

// ---------- Admin endpoint to view pending OTPs (for dev) ----------
app.get("/admin/otps", (req, res) => {
  // WARNING: For production protect this route!
  const list = {};
  for (const phone in pendingOtps) {
    list[phone] = { otp: pendingOtps[phone].otp, createdAt: new Date(pendingOtps[phone].createdAt).toLocaleString() };
  }
  res.json(list);
});

// ---------- WebSocket (ws) for chat (group + private) ----------
wss.on("connection", (ws) => {
  // send initial state if requested
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      // data.type: 'join' | 'group' | 'private' | 'history-request'
      if (data.type === "join") {
        ws._phone = data.phone; // keep track
      }
      else if (data.type === "history-request") {
        if (data.subtype === "group" && groups[data.group]) {
          ws.send(JSON.stringify({ type: "history", subtype: "group", group: data.group, messages: groups[data.group].messages }));
        } else if (data.subtype === "private" && data.with) {
          const key = [data.phone, data.with].sort().join("-");
          ws.send(JSON.stringify({ type: "history", subtype: "private", with: data.with, messages: privateChats[key] || [] }));
        }
      }
      else if (data.type === "group") {
        // save message
        if (!groups[data.group]) groups[data.group] = { description: "", members: [], messages: [] };
        const entry = { user: data.user, message: data.message, time: nowTime(), kind: data.kind || "text" };
        groups[data.group].messages.push(entry);
        // broadcast
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "group", group: data.group, entry }));
          }
        });
      }
      else if (data.type === "private") {
        const key = [data.user, data.to].sort().join("-");
        if (!privateChats[key]) privateChats[key] = [];
        const entry = { user: data.user, to: data.to, message: data.message, time: nowTime(), kind: data.kind || "text" };
        privateChats[key].push(entry);
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "private", key, entry }));
          }
        });
      }
    } catch (e) {
      console.error("Invalid WS message", e);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
