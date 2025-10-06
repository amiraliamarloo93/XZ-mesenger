// auth.js - handles register/login/otp flow (client)
async function doRegister() {
  const phone = document.getElementById('regPhone').value.trim();
  const first = document.getElementById('regFirst').value.trim();
  const last = document.getElementById('regLast').value.trim();
  const pin = document.getElementById('regPin').value.trim();
  if (!phone || pin.length !== 4) { showMsg('شماره و رمز ۴ رقمی لازم است'); return; }
  const res = await fetch('/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone, firstName:first, lastName:last, pin})});
  const data = await res.json();
  if(data.success){
    // show OTP via Notification if allowed or alert
    if (Notification.permission === 'granted') new Notification('XZ OTP', { body: `کد: ${data.otp}` });
    else Notification.requestPermission().then(p => p==='granted' ? new Notification('XZ OTP',{body:`کد: ${data.otp}`}) : alert('کد: '+data.otp));
    localStorage.setItem('regPhone', phone);
    // redirect to otp page
    window.location.href = 'otp.html?phone=' + encodeURIComponent(phone);
  } else showMsg(data.message || 'خطا در ثبت‌نام');
}

async function verifyOtp() {
  const url = new URL(location.href);
  const phone = url.searchParams.get('phone') || localStorage.getItem('regPhone');
  const otp = document.getElementById('otp') ? document.getElementById('otp').value.trim() : prompt('کد OTP را وارد کنید');
  if (!phone || !otp) return;
  const res = await fetch('/verify-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone, otp}) });
  const data = await res.json();
  if (data.success) {
    showOptMsg('ثبت‌نام موفق! اکنون وارد شوید.');
    setTimeout(()=> location.href = 'login.html', 900);
  } else {
    showOptMsg(data.message || 'کد اشتباه است');
  }
}

async function doLogin() {
  const phone = document.getElementById('loginPhone').value.trim();
  const pin = document.getElementById('loginPin').value.trim();
  if (!phone || pin.length!==4) { showMsg('شماره و رمز صحیح وارد کنید'); return; }
  const res = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone, pin})});
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('user', JSON.stringify({ phone, name: data.user ? (data.user.firstName + ' ' + data.user.lastName) : '' }));
    location.href = 'groups.html';
  } else showMsg('شماره یا رمز اشتباه است');
}

function showMsg(t){ const m=document.getElementById('msg'); if(m){ m.innerText=t; m.style.display='block'; } else alert(t); }
function showOptMsg(t){ const m=document.getElementById('optMsg'); if(m){ m.innerText=t; } else alert(t); }

function goToRegister(){ document.getElementById('formLogin').classList.add('hidden'); document.getElementById('formRegister').classList.remove('hidden'); document.getElementById('btnLogin').classList.remove('active'); document.getElementById('btnRegister').classList.add('active'); }
function goToLogin(){ document.getElementById('formLogin').classList.remove('hidden'); document.getElementById('formRegister').classList.add('hidden'); document.getElementById('btnLogin').classList.add('active'); document.getElementById('btnRegister').classList.remove('active'); }

function doLoginFromPage(){ // for login.html
  const phone = document.getElementById('loginPhone2').value.trim();
  const pin = document.getElementById('loginPin2').value.trim(); if(!phone||pin.length!==4) return alert('ورود: شماره و رمز'); fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,pin})}).then(r=>r.json()).then(d=>{ if(d.success){ localStorage.setItem('user',JSON.stringify({phone})); location.href='groups.html'; } else alert('خطا');});
}

document.getElementById && (() => {
  const b1 = document.getElementById('btnLogin');
  const b2 = document.getElementById('btnRegister');
  if (b1 && b2) {
    b1.addEventListener('click', ()=>{ goToLogin(); });
    b2.addEventListener('click', ()=>{ goToRegister(); });
  }
})();
