const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ مسیر استاتیک برای فایل‌های front-end
app.use(express.static(path.join(__dirname, "public")));

// ✅ تست سریع برای چک کردن دسترسی
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ مسیر مستقیم برای پنل ادمین
app.get("/admin.html", (req, res) => {
  const filePath = path.join(__dirname, "public", "admin.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("❌ فایل admin.html یافت نشد!");
  }
});

// ✅ فقط برای تست (می‌تونی حذفش کنی بعداً)
app.get("/ping", (req, res) => {
  res.send("✅ سرور فعاله و آماده‌ست!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
