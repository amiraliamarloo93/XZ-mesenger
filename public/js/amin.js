// public/js/admin.js
async function adminLogin(){
  const pass = document.getElementById('adminPass').value;
  const res = await fetch('/api/admin/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ password: pass }) }).then(r=>r.json());
  if(res.success){
    localStorage.setItem('adminToken', res.token);
    document.getElementById('adminArea').classList.remove('hidden');
    document.getElementById('adminMsg').innerText='';
    loadAdminData();
  } else document.getElementById('adminMsg').innerText='رمز اشتباه';
}
async function loadAdminData(){
  const token = localStorage.getItem('adminToken');
  const otps = await fetch('/api/admin/otps', { headers:{ 'x-admin-token': token } }).then(r=>r.json());
  const users = await fetch('/api/admin/users', { headers:{ 'x-admin-token': token } }).then(r=>r.json());
  document.getElementById('otpList').innerText = JSON.stringify(otps, null, 2);
  document.getElementById('userList').innerText = JSON.stringify(users, null, 2);
}
function logoutAdmin(){ localStorage.removeItem('adminToken'); document.getElementById('adminArea').classList.add('hidden'); }
