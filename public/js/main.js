// main.js - handles auth page and global helpers
document.addEventListener('DOMContentLoaded', ()=> {
  // autofocus phone input if present
  const phoneEl = document.querySelector('input[placeholder*="شماره"]');
  if(phoneEl) phoneEl.focus();
});

async function requestOtp() {
  const phone = document.getElementById('phone').value;
  const firstName = document.getElementById('firstName') ? document.getElementById('firstName').value : '';
  const lastName = document.getElementById('lastName') ? document.getElementById('lastName').value : '';
  const pin = document.getElementById('pin') ? document.getElementById('pin').value : '';
  if(!phone || !pin) return alert('شماره و رمز ۴ رقمی را وارد کنید');

  try {
    const res = await fetch('/api/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ phone, firstName, lastName, pin })
    });
    const data = await res.json();
    if(data.success){
      // show notification (browser)
      if(Notification.permission === "granted"){
        new Notification('XZ Messenger', { body: `کد تایید: ${data.otp}` });
      } else {
        Notification.requestPermission().then(p=>{
          if(p === 'granted') new Notification('XZ Messenger', { body: `کد تایید: ${data.otp}` });
          else alert('کد: ' + data.otp);
        });
      }
      // store phone temporarily and go to otp page
      localStorage.setItem('pendingPhone', phone);
      window.location.href = '/otp';
    } else {
      alert(data.message || 'خطا در ثبت‌نام');
    }
  } catch(e){
    console.error(e);
    alert('خطا در ارتباط با سرور');
  }
}

async function verifyOtpClient() {
  const phone = localStorage.getItem('pendingPhone');
  const otp = document.getElementById('otp') ? document.getElementById('otp').value : '';
  if(!phone || !otp) return alert('phone or otp missing');
  const res = await fetch('/api/verify-otp', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ phone, otp })
  });
  const data = await res.json();
  if(data.success){
    alert('ثبت نام با موفقیت انجام شد. حالا وارد شوید.');
    window.location.href = '/login';
  } else {
    alert(data.message || 'کد اشتباه است');
  }
}

async function loginClient() {
  const phone = document.getElementById('phoneLogin').value;
  const pin = document.getElementById('pinLogin').value;
  if(!phone || !pin) return alert('شماره و رمز را وارد کنید');
  const res = await fetch('/api/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ phone, pin })
  });
  const data = await res.json();
  if(data.success){
    localStorage.setItem('user', JSON.stringify({ phone, firstName: (data.user && data.user.firstName) || '' }));
    window.location.href = '/groups';
  } else {
    alert('شماره یا رمز اشتباه است');
  }
}
