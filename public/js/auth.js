// public/js/auth.js
const api = (path, opts={}) => fetch('/api'+path, { headers:{ 'Accept':'application/json' }, ...opts }).then(r=>r.json());

// UI helpers
function showMsg(id, txt, color='red'){ const e=document.getElementById(id); if(e){ e.innerText=txt; e.style.color=color; }}

// toggle login/register
document.getElementById('btnLogin')?.addEventListener('click', ()=>{ document.getElementById('loginBox').classList.remove('hidden'); document.getElementById('registerBox').classList.add('hidden'); document.getElementById('btnLogin').classList.add('active'); document.getElementById('btnRegister').classList.remove('active');});
document.getElementById('btnRegister')?.addEventListener('click', ()=>{ document.getElementById('registerBox').classList.remove('hidden'); document.getElementById('loginBox').classList.add('hidden'); document.getElementById('btnRegister').classList.add('active'); document.getElementById('btnLogin').classList.remove('active');});

function goRegister(){ document.getElementById('btnRegister').click(); }
function goLogin(){ document.getElementById('btnLogin').click(); }

async function requestOtp(){
  const phone = document.getElementById('regPhone').value.trim();
  const first = document.getElementById('regFirst').value.trim();
  const last = document.getElementById('regLast').value.trim();
  const pin = document.getElementById('regPin').value.trim();
  if(!phone || !pin || pin.length!==4) return showMsg('regMsg','شماره یا رمز ۴ رقمی صحیح نیست');
  const res = await api('/register', { method:'POST', body: JSON.stringify({ phone, firstName:first, lastName:last, pin }), headers:{ 'Content-Type':'application/json' }});
  if(res.success){
    // به صفحه otp می‌رویم و شماره ذخیره می‌شود
    localStorage.setItem('pendingPhone', phone);
    // نمایش نوتیف مرورگر (در dev otp را برمیگردانیم)
    if(res.otp){
      if(Notification.permission === 'granted') new Notification('XZ OTP', { body: 'کد شما: '+res.otp });
      else Notification.requestPermission().then(p=>{ if(p==='granted') new Notification('XZ OTP',{ body: 'کد شما: '+res.otp }); else alert('کد OTP: '+res.otp); });
    }
    window.location.href = '/otp.html?phone='+encodeURIComponent(phone);
  } else showMsg('regMsg', res.message || 'خطا');
}

async function verifyOtp(){
  const url = new URL(location.href);
  const phone = url.searchParams.get('phone') || document.getElementById('otpPhone')?.value || localStorage.getItem('pendingPhone');
  const otp = document.getElementById('otpCode').value.trim();
  if(!phone || !otp) return showMsg('otpMsg','شماره یا کد نامعتبر');
  const res = await api('/verify-otp', { method:'POST', body: JSON.stringify({ phone, otp }), headers:{ 'Content-Type':'application/json' }});
  if(res.success){
    // کاربر ساخته شد؛ هدایت به صفحهٔ ورود
    alert('ثبت‌نام انجام شد؛ اکنون وارد شوید');
    window.location.href = '/';
  } else showMsg('otpMsg', res.message || 'کد اشتباه');
}

async function doLogin(){
  const phone = document.getElementById('loginPhone').value.trim();
  const pin = document.getElementById('loginPin').value.trim();
  if(!phone || !pin) return showMsg('loginMsg','شماره/رمز را وارد کنید');
  const res = await api('/login', { method:'POST', body: JSON.stringify({ phone, pin }), headers:{ 'Content-Type':'application/json'}});
  if(res.success){
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('phone', res.user.phone);
    window.location.href = '/groups.html';
  } else showMsg('loginMsg', res.message || 'ورود ناموفق');
}

function doLoginFromLogin(){
  const phone = document.getElementById('loginPhone2').value.trim();
  const pin = document.getElementById('loginPin2').value.trim();
  document.getElementById('loginPhone').value = phone;
  document.getElementById('loginPin').value = pin;
  doLogin();
}

function logout(){ localStorage.removeItem('user'); localStorage.removeItem('phone'); window.location.href='/'; }

// profile functions
async function saveProfile(){
  const phone = localStorage.getItem('phone');
  const first = document.getElementById('pFirst').value;
  const last = document.getElementById('pLast').value;
  const pin = document.getElementById('pPin').value;
  // این نسخه ساده؛ ما از api update-profile استفاده نکردیم؛ برای توسعه می‌تونی endpoint اضافه کنی.
  const dbUser = JSON.parse(localStorage.getItem('user') || '{}');
  dbUser.firstName = first; dbUser.lastName = last; if(pin) dbUser.pin = pin;
  localStorage.setItem('user', JSON.stringify(dbUser));
  showMsg('pMsg','ذخیره شد','green');
}
function goHome(){ window.location.href='/groups.html'; }

// onload for profile page
window.addEventListener('load', ()=>{
  const user = JSON.parse(localStorage.getItem('user')||'null');
  if(user){
    const f = document.getElementById('pFirst'); if(f) f.value = user.firstName||'';
    const l = document.getElementById('pLast'); if(l) l.value = user.lastName||'';
  }
});
