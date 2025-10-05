const socket = io(); // اتصال به سرور

// صفحات
const welcomePage = document.getElementById('welcomePage');
const registerPage = document.getElementById('registerPage');
const loginPage = document.getElementById('loginPage');
const homePage = document.getElementById('homePage');
const profilePage = document.getElementById('profilePage');
const settingsPage = document.getElementById('settingsPage');
const createGroupPage = document.getElementById('createGroupPage');

// دکمه‌ها
document.getElementById('goLogin').onclick = () => switchPage(loginPage);
document.getElementById('goRegister').onclick = () => switchPage(registerPage);
document.getElementById('backWelcomeFromReg').onclick = () => switchPage(welcomePage);
document.getElementById('backWelcomeFromLogin').onclick = () => switchPage(welcomePage);

// ثبت‌نام
let generatedOtp = null;
document.getElementById('sendOtpReg').onclick = () => {
  const phone = document.getElementById('regPhone').value;
  if(!phone) return alert('شماره موبایل را وارد کنید!');
  generatedOtp = Math.floor(1000 + Math.random()*9000);
  alert('کد OTP: ' + generatedOtp); // تست
  document.getElementById('otpInputReg').classList.remove('hidden');
  document.getElementById('regFullName').classList.remove('hidden');
  document.getElementById('regPin').classList.remove('hidden');
  document.getElementById('verifyReg').classList.remove('hidden');
};

document.getElementById('verifyReg').onclick = () => {
  const otp = document.getElementById('otpInputReg').value;
  const pin = document.getElementById('regPin').value;
  const name = document.getElementById('regFullName').value;
  const phone = document.getElementById('regPhone').value;
  if(otp != generatedOtp || !pin || !name) return alert('اطلاعات اشتباه است!');
  localStorage.setItem('user', JSON.stringify({phone, pin, name}));
  switchPage(homePage);
  loadUser();
};

// ورود
document.getElementById('loginBtn').onclick = () => {
  const phone = document.getElementById('loginPhone').value;
  const pin = document.getElementById('loginPin').value;
  const user = JSON.parse(localStorage.getItem('user'));
  if(user && user.phone === phone && user.pin === pin) switchPage(homePage);
  else alert('اطلاعات اشتباه است!');
  loadUser();
};

// بارگذاری کاربر
function loadUser() {
  const user = JSON.parse(localStorage.getItem('user'));
  if(user) document.getElementById('profileName').value = user.name;
  if(user) document.getElementById('profilePin').value = user.pin;
}

// پروفایل
document.getElementById('profileBtn').onclick = () => switchPage(profilePage);
document.getElementById('backHomeFromProfile').onclick = () => switchPage(homePage);
document.getElementById('saveProfileBtn').onclick = () => {
  const name = document.getElementById('profileName').value;
  const pin = document.getElementById('profilePin').value;
  const user = JSON.parse(localStorage.getItem('user'));
  user.name = name; user.pin = pin;
  localStorage.setItem('user', JSON.stringify(user));
  alert('ذخیره شد!');
};

// تنظیمات
document.getElementById('settingsBtn').onclick = () => switchPage(settingsPage);
document.getElementById('backHomeFromSettings').onclick = () => switchPage(homePage);

// ساخت گروه
document.getElementById('createGroupBtn').onclick = () => switchPage(createGroupPage);
document.getElementById('backHomeFromCreateGroup').onclick = () => switchPage(homePage);

// ارسال پیام
const msgInput = document.getElementById('msgInput');
document.getElementById('sendBtn').onclick = sendMessage;
msgInput.addEventListener('keydown', e => { if(e.key === 'Enter') sendMessage(); });

function sendMessage() {
  const msg = msgInput.value.trim();
  if(!msg) return;
  const user = JSON.parse(localStorage.getItem('user'));
  addMessage(msg, user.name, 'sent');
  socket.emit('message', {text: msg, name: user.name});
  msgInput.value = '';
}

// دریافت پیام از سرور
socket.on('message', data => addMessage(data.text, data.name, 'received'));

// افزودن پیام به صفحه
function addMessage(text, name, type) {
  const div = document.createElement('div');
  div.className = 'message ' + type;
  div.innerHTML = `<b>${name}</b><br>${text}`;
  document.getElementById('messages').appendChild(div);
  div.scrollIntoView();
}

// سوییچ صفحه
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
}

// خروج
document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('user');
  switchPage(welcomePage);
};
