// otp.js - otp page script
document.addEventListener('DOMContentLoaded', ()=>{
  const phone = localStorage.getItem('pendingPhone');
  if(phone) {
    const info = document.getElementById('otpInfo');
    if(info) info.innerText = `کد برای: ${phone}`;
  }
});

function verifyOTPPage(){
  const otp = document.getElementById('otp').value;
  if(!otp) return alert('کد را وارد کنید');
  // call main verify
  fetch('/api/verify-otp', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ phone: localStorage.getItem('pendingPhone'), otp })
  }).then(r=>r.json()).then(data=>{
    if(data.success){
      alert('حساب ساخته شد.');
      window.location.href = '/login';
    } else {
      alert(data.message || 'کد اشتباه است');
    }
  }).catch(e=>{
    console.error(e); alert('خطا');
  });
}
