const socket=io();
let currentChat=null;let generatedOtp=null;
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');}
// Welcome Page
document.getElementById('goLogin').onclick=()=>showPage('loginPage');
document.getElementById('goRegister').onclick=()=>showPage('registerPage');
// Back Buttons
document.querySelectorAll('.backBtn').forEach(btn=>{btn.onclick=()=>showPage('welcomePage');});
// Register
document.getElementById('sendOtpReg').onclick=()=>{
const phone=document.getElementById('regPhone').value;
if(!phone)return alert("شماره وارد کنید");
generatedOtp=Math.floor(1000+Math.random()*9000);
if(Notification.permission==='granted'){new Notification("کد تایید",{body:generatedOtp});}else Notification.requestPermission().then(p=>{if(p==='granted')new Notification("کد تایید",{body:generatedOtp});});
document.getElementById('otpInputReg').classList.remove('hidden');
document.getElementById('fullName').classList.remove('hidden');
document.getElementById('regPin').classList.remove('hidden');
document.getElementById('verifyOtpReg').classList.remove('hidden');
};
document.getElementById('verifyOtpReg').onclick=()=>{
const otp=document.getElementById('otpInputReg').value;
const pin=document.getElementById('regPin').value;
const fullName=document.getElementById('fullName').value;
const phone=document.getElementById('regPhone').value;
if(otp==generatedOtp && pin.length==4){
localStorage.setItem('user',JSON.stringify({fullName,phone,pin}));
loadHome();}else alert("کد یا رمز اشتباه است");};
// Login
document.getElementById('loginBtn').onclick=()=>{
const phone=document.getElementById('loginPhone').value;
const pin=document.getElementById('loginPin').value;
const user=JSON.parse(localStorage.getItem('user'));
if(user && user.phone===phone && user.pin===pin) loadHome(); else alert("شماره یا رمز اشتباه است");
};
// Load Home
function loadHome(){showPage('homePage');updateChatList();}
// Logout
document.getElementById('logoutBtn').onclick=()=>showPage('welcomePage');
// Create Group
document.getElementById('createGroupBtn').onclick=()=>showPage('createGroupPage');
document.getElementById('createGroupConfirm').onclick=()=>{
const name=document.getElementById('groupName').value;
if(!name)return alert("نام گروه را وارد کنید");
socket.emit('createGroup',name);
showPage('homePage');};
// Profile & Settings
document.getElementById('profileBtn').onclick=()=>showPage('profilePage');
document.getElementById('settingsBtn').onclick=()=>showPage('settingsPage');
document.getElementById('saveProfileBtn').onclick=()=>{
const name=document.getElementById('profileName').value;
const pin=document.getElementById('profilePin').value;
const user=JSON.parse(localStorage.getItem('user'));
user.fullName=name;user.pin=pin;
localStorage.setItem('user',JSON.stringify(user));
alert("ذخیره شد");};
// Send Message
const msgInput=document.getElementById('msgInput');
const sendBtn=document.getElementById('sendBtn');
sendBtn.onclick=sendMessage;
msgInput.addEventListener("keypress",function(e){if(e.key==="Enter")sendMessage();});
function sendMessage(){
const msg=msgInput.value.trim();
if(!msg||!currentChat)return;
socket.emit('sendMessage',{chat:currentChat,message:msg,user:JSON.parse(localStorage.getItem('user')).fullName});
msgInput.value="";}
// Receive Message
socket.on('receiveMessage',data=>{
if(data.chat!==currentChat)return;
const msgBox=document.createElement('div');
msgBox.className="message received";
msgBox.innerHTML=`<b>${data.user}:</b> ${data.message}`;
document.getElementById('messages').appendChild(msgBox);
msgBox.scrollIntoView();});
// Update Chat List
function updateChatList(){
const chatList=document.getElementById('chatList');
chatList.innerHTML="";
socket.emit('getChats',null,(chats)=>{chats.forEach(c=>{const div=document.createElement('div');div.className="chat-item";div.textContent=c;div.onclick=()=>{currentChat=c;document.getElementById('chatHeader').textContent=c;document.getElementById('messages').innerHTML="";};chatList.appendChild(div);});});
}
