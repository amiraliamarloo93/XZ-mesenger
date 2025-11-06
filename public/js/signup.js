document.getElementById("otp-btn").addEventListener("click", async () => {
  const phone = document.getElementById("signup-phone").value.trim();
  const name = document.getElementById("signup-name").value.trim();
  const family = document.getElementById("signup-family").value.trim();
  const pass = document.getElementById("signup-pass").value.trim();

  if (!phone || !name || !family || !pass) {
    alert("تمام فیلدها را پر کنید!");
    return;
  }

  if (phone.length !== 11 || !phone.startsWith("09")) {
    alert("شماره موبایل معتبر نیست!");
    return;
  }

  if (pass.length !== 4) {
    alert("رمز باید ۴ رقم باشد!");
    return;
  }

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name, family, pass }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      localStorage.setItem("userPhone", phone);
      window.location.href = "index.html"; // بعد از ثبت‌نام برمی‌گرده صفحه ورود
    }
  } catch (err) {
    alert("خطا در ارتباط با سرور!");
  }
});
