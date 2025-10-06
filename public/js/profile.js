// profile.js
async function saveProfile(){
  const phone = (JSON.parse(localStorage.getItem('user')||'{}')).phone;
  const first = document.getElementById('pfName').value;
  const last = document.getElementById('pfLast').value;
  const pin = document.getElementById('pfPin').value;
  const res = await fetch('/update-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone, firstName:first, lastName:last, pin})});
  const d = await res.json(); if(d.success) alert('بروزرسانی شد'); else alert('خطا');
}

document.addEventListener('DOMContentLoaded', ()=>{
  const u = JSON.parse(localStorage.getItem('user')||'{}');
  document.getElementById('pfName').value = u.name ? u.name.split(' ')[0] : '';
  document.getElementById('pfLast').value = u.name ? u.name.split(' ').slice(1).join(' ') : '';
});
