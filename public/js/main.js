// تعویض بین صفحات ورود و ثبت‌نام
document.getElementById("goRegister").onclick = () => {
  document.getElementById("loginPage").classList.remove("active");
  document.getElementById("registerPage").classList.add("active");
};

document.getElementById("backToLogin").onclick = () => {
  document.getElementById("registerPage").classList.remove("active");
  document.getElementById("loginPage").classList.add("active");
};

// دکمه‌های نمونه برای تست
document.getElementById("loginBtn").onclick = () => {
  alert("ورود با موفقیت انجام شد ✅");
};

document.getElementById("registerBtn").onclick = () => {
  alert("کد تأیید ارسال شد ✅ (شبیه‌سازی)");
};
