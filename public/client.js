const socket = io();
let currentUser = null;
let currentGroup = null;
let otpCode = null;

// دکمه‌های خانه
document.querySelectorAll('.backHome').forEach(b => b.onclick = () => {
  showSection('auth-page');
});

// ورود و ثبت‌نام
document.getElementById('loginBtn').onclick = () => showSection('login-form');
document.getElementById('registerBtn').onclick = () => showSection('register-form');

// ارسال OTP
document.getElementById('otpSendBtn').onclick = () => {
  otpCode = Math.floor(1000 + Math.random()*9000);
  alert('کد OTP: ' + otpCode);
  document.getElementById('otpInput').classList.remove('hidden');
  document.getElementById('regName').classList.remove('hidden');
  document.getElementById('regPin').classList.remove('hidden');
  document.getElementById('registerSubmit').classList.remove('hidden');
};

// ثبت‌نام
document.getElementById('registerSubmit').onclick = () => {
  const code = document.getElementById('otpInput').value;
  if(code != otpCode) return alert('کد اشتباه است!');
  const name = document.getElementById('regName').value;
  const phone = document.getElementById('regPhone').value;
  const pin = document.getElementById('regPin').value;
  currentUser = { name, phone, pin };
  showSection('app');
};

// ورود
document.getElementById('loginSubmit').onclick = () => {
  const phone = document.getElementById('loginPhone').value;
  const pin = document.getElementById('loginPin').value;
  if(!phone || !pin) return alert('شماره و رمز را وارد کنید!');
  currentUser = { name: 'کاربر', phone, pin };
  showSection('app');
};

// تغییر نمایش
function showSection(cls) {
  document.querySelectorAll('.auth-page,.login-form,.register-form,.app,.profile,.group-settings').forEach(s => s.classList.add('hidden'));
  document.querySelector('.' + cls).classList.remove('hidden');
}

// دکمه پروفایل
document.getElementById('profileBtn').onclick = () => {
  document.getElementById('userInfo').innerText = `نام: ${currentUser.name}\nشماره: ${currentUser.phone}`;
  showSection('profile');
};

// دکمه ساخت گروه
document.getElementById('groupBtn').onclick = () => {
  const groupName = prompt('نام گروه:');
  if(!groupName) return;
  currentGroup = groupName;
  addChat(groupName);
  joinGroup(groupName);
};

// دکمه خروج
document.getElementById('logoutBtn').onclick = () => location.reload();

// اضافه کردن به لیست گفتگو
function addChat(name) {
  const chatList = document.getElementById('chatList');
  const div = document.createElement('div');
  div.className = 'chat-item';
  div.innerText = name;
  div.onclick = () => openChat(name);
  chatList.appendChild(div);
}

// باز کردن چت
function openChat(name) {
  currentGroup = name;
  document.getElementById('chatHeader').innerText = name;
  document.getElementById('messages').innerHTML = '';
  joinGroup(name);
}

// جوین به گروه
function joinGroup(group) {
  socket.emit('join', { username: currentUser.name, group });
}

// ارسال پیام
const msgInput = document.getElementById('msgInput');
document.getElementById('sendBtn').onclick = sendMsg;
msgInput.addEventListener('keydown', e => { if(e.key==='Enter') sendMsg(); });

function sendMsg() {
  const msg = msgInput.value.trim();
  if(!msg || !currentGroup) return;
  socket.emit('message', msg);
  msgInput.value = '';
}

// ارسال فایل
document.getElementById('fileInput').onchange = async e => {
  const file = e.target.files[0];
  const data = new FormData();
  data.append('file', file);
  const res = await fetch('/upload', { method:'POST', body:data });
  const json = await res.json();
  socket.emit('sendFile', { url: json.url, type: file.type });
};

// دریافت پیام‌ها
socket.on('message', data => {
  const div = document.createElement('div');
  div.className = data.username === currentUser.name ? 'message sent' : 'message received';
  div.innerHTML = `<b>${data.username}</b><br>${data.text}`;
  document.getElementById('messages').appendChild(div);
  div.scrollIntoView();
});

socket.on('file', data => {
  const div = document.createElement('div');
  div.className = data.username === currentUser.name ? 'message sent' : 'message.received';
  if(data.type.startsWith('audio'))
    div.innerHTML = `<b>${data.username}</b><br><audio controls src="${data.url}"></audio>`;
  else
    div.innerHTML = `<b>${data.username}</b><br><img src="${data.url}" style="max-width:200px;">`;
  document.getElementById('messages').appendChild(div);
  div.scrollIntoView();
});

socket.on('systemMessage', text => {
  const div = document.createElement('div');
  div.className = 'message received';
  div.innerHTML = `<i>${text}</i>`;
  document.getElementById('messages').appendChild(div);
  div.scrollIntoView();
});
