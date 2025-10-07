// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

// فایل JSON برای کاربران و OTP
const USERS_FILE = path.join(__dirname, "data", "users.json");
const OTP_FILE = path.join(__dirname, "data", "otps.json");

// اطمینان از وجود پوشه‌ها و فایل‌ها
if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(OTP_FILE)) fs.writeFileSync(OTP_FILE, "[]");

// تنظیمات اولیه
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// مسیر فایل‌های استاتیک (HTML, CSS, JS, assets)
app.use(express.static(path.join(__dirname, "public")));

// مسیر اصلی سایت
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// مسیر گروه‌ها
app.get("/groups", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "groups.html"));
});

// مسیر پنل ادمین
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// API ساخت OTP
app.post("/api/otp", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "شماره الزامی است." });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const allOtps = JSON.parse(fs.readFileSync(OTP_FILE));
  allOtps.push({ phone, otp, time: new Date().toISOString() });
  fs.writeFileSync(OTP_FILE, JSON.stringify(allOtps, null, 2));

  console.log(`✅ OTP برای ${phone} = ${otp}`);
  res.json({ success: true, message: "کد ارسال شد (در کنسول)" });
});

// API ثبت‌نام
app.post("/api/register", (req, res) => {
  const { phone, name, password } = req.body;
  if (!phone || !name || !password)
    return res.status(400).json({ error: "تمام فیلدها الزامی هستند." });

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  if (users.find((u) => u.phone === phone))
    return res.status(400).json({ error: "این شماره قبلاً ثبت شده است." });

  users.push({ phone, name, password });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.json({ success: true, message: "ثبت‌نام با موفقیت انجام شد." });
});

// API ورود
app.post("/api/login", (req, res) => {
  const { phone, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));

  const user = users.find(
    (u) => u.phone === phone && u.password === password
  );

  if (!user) return res.status(401).json({ error: "کاربر یافت نشد." });

  res.json({ success: true, message: "ورود موفقیت‌آمیز!" });
});

// مسیر مشاهده OTP ها (برای ادمین)
app.get("/api/admin/otps", (req, res) => {
  const allOtps = JSON.parse(fs.readFileSync(OTP_FILE));
  res.json(allOtps);
});

// مسیر مشاهده کاربران (برای ادمین)
app.get("/api/admin/users", (req, res) => {
  const allUsers = JSON.parse(fs.readFileSync(USERS_FILE));
  res.json(allUsers);
});

// راه‌اندازی سرور
app.listen(PORT, () => {
  console.log(`🚀 سرور در حال اجرا است: http://localhost:${PORT}`);
});
