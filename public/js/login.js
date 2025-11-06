// login.js - login page
document.addEventListener('DOMContentLoaded', ()=>{
  const phone = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).phone : '';
  if(phone) document.getElementById('phoneLogin').value = phone;
});

function loginHandler(){
  const phone = document.getElementById('phoneLogin').value;
  const pin = document.getElementById('pinLogin').value;
  if(!phone || !pin) return alert('شماره و رمز را وارد کنید');
  fetch('/api/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ phone, pin })
  }).then(r=>r.json()).then(data=>{
    if(data.success){
      localStorage.setItem('user', JSON.stringify({ phone }));
      window.location.href = '/groups';
    } else alert('شماره یا رمز اشتباه است');
  });
}
document.getElementById("login-btn").addEventListener("click", async () => {
  const phone = document.getElementById("login-phone").value.trim();
  const pass = document.getElementById("login-pass").value.trim();

  if (!phone || !pass) {
    alert("تمام فیلدها را پر کنید!");
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pass }),
    });

    const data = await res.json();

    if (data.success) {
      alert("خوش آمدید!");
      window.location.href = "groups.html"; // بعداً این صفحه ساخته می‌شه
    } else {
      alert(data.message || "ورود ناموفق!");
    }
  } catch (err) {
    alert("خطا در اتصال به سرور!");
  }
});
