let socket = io();
let currentUser = null;
let currentChat = null;
let generatedOtp = null;
let recorder, audioChunks = [];

// مدیریت صفحات
function showPage(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// ورود
function loginUser(){
  const phone = document.getElementById('loginPhone').value;
  const pin = document.getElementById('loginPin').value;
  const user = JSON.parse(localStorage.getItem(phone));
  if(user && user.pin===pin){currentUser=user;showPage('appPage');loadChats();}
  else alert('شماره یا رمز اشتباه است');
}

// ثبت نام و OTP
function requestOtp(){
  const phone = document.getElementById('registerPhone').value;
  if(!phone) return alert('شماره را وارد کنید');
  generatedOtp = Math.floor(1000 + Math.random()*9000);
  if(Notification.permission==='granted') new Notification('کد OTP شما', {body:generatedOtp});
  else Notification.requestPermission().then(p=>{if(p==='granted') new Notification('کد OTP شما',{body:generatedOtp});});
  document.getElementById('otpInput').classList.remove('hidden');
  document.getElementById('fullName').classList.remove('hidden');
  document.getElementById('pin').classList.remove('hidden');
  document.getElementById('verifyBtn').classList.remove('hidden');
}

function verifyOtp(){
  const otp = document.getElementById('otpInput').value;
  const fullName = document.getElementById('fullName').value;
  const pin = document.getElementById('pin').value;
  const phone = document.getElementById('registerPhone').value;
  if(otp==generatedOtp && pin.length===4){
    localStorage.setItem(phone,JSON.stringify({fullName,phone,pin}));
    currentUser={fullName,phone,pin};
    showPage('appPage');
    loadChats();
  } else alert('کد OTP یا رمز اشتباه است');
}

// خانه/پروفایل
function showProfile(){
  document.getElementById('profileName').innerText='نام: '+currentUser.fullName;
  document.getElementById('profilePhone').innerText='شماره: '+currentUser.phone;
  showPage('profilePage');
}

// گروه/کانال
function showGroupSettings(){
  if(currentChat){
    document.getElementById('groupSettingsName').innerText=currentChat;
    showPage('groupSettingsPage');
  } else alert('ابتدا یک گروه انتخاب کنید');
}

// تغییر نام گروه
function changeGroupName(){
  const newName=document.getElementById('groupNameInput').value.trim();
  if(newName){currentChat=newName;document.getElementById('chatHeader').innerText=newName;alert('نام گروه تغییر کرد');}
}

// خروج
function logout(){currentUser=null;showPage('homePage');}

// ارسال پیام
function sendMessage(){
  const msg=document.getElementById('msgInput').value.trim();
  if(msg && currentChat){
    const msgBox=document.createElement('div');
    msgBox.className='message sent';
    msgBox.innerHTML=`<div class="sender">${currentUser.fullName}</div>${msg}`;
    document.getElementById('messages').appendChild(msgBox);
    socket.emit('message',{chat:currentChat,user:currentUser,msg});
    document.getElementById('msgInput').value='';
    msgBox.scrollIntoView();
  }
}

// ارسال با Enter
function enterSend(e){if(e.key==='Enter'){sendMessage();e.preventDefault();}}

// ارسال تصویر
function sendImage(e){
  const file=e.target.files[0];
  if(file && currentChat){
    const reader=new FileReader();
    reader.onload=function(ev){
      const imgBox=document.createElement('div');
      imgBox.className='message sent';
      imgBox.innerHTML=`<div class="sender">${currentUser.fullName}</div><img src="${ev.target.result}" style="max-width:200px;border-radius:10px;">`;
      document.getElementById('messages').appendChild(imgBox);
      socket.emit('image',{chat:currentChat,user:currentUser,img:ev.target.result});
      imgBox.scrollIntoView();
    };
    reader.readAsDataURL(file);
  }
}

// ضبط و ارسال ویس
function startRecording(){
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    recorder=new MediaRecorder(stream);
    audioChunks=[];
    recorder.ondataavailable=e=>audioChunks.push(e.data);
    recorder.onstop=e=>{
      const audioBlob=new Blob(audioChunks,{type:'audio/webm'});
      const url=URL.createObjectURL(audioBlob);
      const audioBox=document.createElement('div');
      audioBox.className='message sent';
      audioBox.innerHTML=`<div class="sender">${currentUser.fullName}</div><audio controls src="${url}"></audio>`;
      document.getElementById('messages').appendChild(audioBox);
      audioBox.scrollIntoView();
      socket.emit('voice',{chat:currentChat,user:currentUser,blob:audioBlob});
    };
    recorder.start();
    setTimeout(()=>recorder.stop(),5000); // 5 ثانیه ضبط
  });
}

// دریافت پیام از سرور
socket.on('message',data=>{
  if(data.chat===currentChat && data.user.phone!==currentUser.phone){
    const msgBox=document.createElement('div');
    msgBox.className='message received';
    msgBox.innerHTML=`<div class="sender">${data.user.fullName}</div>${data.msg}`;
    document.getElementById('messages').appendChild(msgBox);
    msgBox.scrollIntoView();
  }
});
socket.on('image',data=>{
  if(data.chat===currentChat && data.user.phone!==currentUser.phone){
    const imgBox=document.createElement('div');
    imgBox.className='message received';
    imgBox.innerHTML=`<div class="sender">${data.user.fullName}</div><img src="${data.img}" style="max-width:200px;border-radius:10px;">`;
    document.getElementById('messages').appendChild(imgBox);
    imgBox.scrollIntoView();
  }
});
