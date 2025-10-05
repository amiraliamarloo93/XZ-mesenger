const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// ذخیره OTP در حافظه ساده
let otpStore = {};

// Middleware
app.use(bodyParser.json());

// سرو استاتیک برای کلاینت
app.use(express.static(path.join(__dirname, "client")));

// API برای ارسال OTP
app.post("/api/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "شماره تلفن الزامی است" });
  }

  // تولید کد ۴ رقمی
  const otp = Math.floor(1000 + Math.random() * 9000);
  otpStore[phone] = otp;

  console.log(`📲 ارسال OTP برای ${phone}: ${otp}`);

  // فعلاً به‌جای ارسال پیام، فقط در لاگ ذخیره میشه
  return res.json({ message: "کد ارسال شد (در لاگ ببینید)" });
});

// API برای تایید OTP
app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (otpStore[phone] && otpStore[phone] == otp) {
    delete otpStore[phone]; // یکبار مصرف
    return res.json({ success: true, message: "ورود موفقیت‌آمیز" });
  }

  return res.status(400).json({ success: false, message: "کد اشتباه است" });
});

// اجرا
app.listen(PORT, () => {
  console.log(`🚀 سرور روی http://127.0.0.1:${PORT} اجرا شد`);
});