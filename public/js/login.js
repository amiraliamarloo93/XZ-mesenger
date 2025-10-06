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
