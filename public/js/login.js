document.getElementById('loginForm').addEventListener('submit', e=>{
  e.preventDefault();
  const phone = document.getElementById('phone').value;
  const pin = document.getElementById('pin').value;
  if(!phone || !pin) return alert('همه فیلدها لازم است');
  localStorage.setItem('phone', phone);
  localStorage.setItem('pin', pin);
  window.location.href = '/home';
});
