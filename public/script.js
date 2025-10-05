// ====== Initialize ======
let currentUser = null;
let currentChat = null;
let chats = {}; // structure: {chatName: [{sender, msg, type, time, file}...] }
let groups = {}; // {groupName: {admin: phone, members: []}}
let notificationsGranted = false;

// ====== Check previous login ======
window.onload = () => {
  const user = localStorage.getItem("user");
  if(user){
    currentUser = JSON.parse(user);
    showHome();
  }
  if(Notification.permission === "granted") notificationsGranted = true;
}

// ====== OTP ======
let generatedOtp = null;
function requestOtp(){
  const phone = document.getElementById("phoneInput").value.trim();
  if(!phone) return alert("شماره موبایل را وارد کنید!");
  generatedOtp = Math.floor(1000 + Math.random() * 9000);
  if(notificationsGranted){
    new Notification("کد تایید شما", {body: generatedOtp});
  } else {
    Notification.requestPermission().then(p=>{
      if(p==="granted"){
        notificationsGranted = true;
        new Notification("کد تایید شما", {body: generatedOtp});
      }
    });
  }
  document.getElementById("otpContainer").classList.remove("hidden");
  document.getElementById("verifyBtn").classList.remove("hidden");
}

// ====== Verify OTP ======
function verifyOtp(){
  const otpInput = document.getElementById("otpInput").value.trim();
  const fullName = document.getElementById("fullNameInput").value.trim();
  const pin = document.getElementById("pinInput").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();

  if(parseInt(otpInput) === generatedOtp && pin.length === 4){
    currentUser = {fullName, phone, pin};
    localStorage.setItem("user", JSON.stringify(currentUser));
    showHome();
  } else {
    alert("کد تایید یا رمز اشتباه است!");
  }
}

// ====== Show Home ======
function showHome(){
  document.getElementById("loginRegister").classList.add("hidden");
  document.getElementById("home").classList.remove("hidden");
  document.getElementById("chatHeader").innerText = "یک گفتگو انتخاب کنید";
  renderChatList();
}

// ====== Render Chat List ======
function renderChatList(){
  const chatList = document.getElementById("chatList");
  chatList.innerHTML = "";
  // Groups
  for(let group in groups){
    const div = document.createElement("div");
    div.className = "chat-item";
    div.innerText = group;
    div.onclick = ()=>openChat(group);
    chatList.appendChild(div);
  }
  // Personal chats
  for(let chat in chats){
    if(!groups[chat]){
      const div = document.createElement("div");
      div.className = "chat-item";
      div.innerText = chat;
      div.onclick = ()=>openChat(chat);
      chatList.appendChild(div);
    }
  }
}

// ====== Open Chat ======
function openChat(chatName){
  currentChat = chatName;
  document.getElementById("chatHeader").innerText = chatName;
  document.getElementById("messages").innerHTML = "";
  if(!chats[chatName]) chats[chatName] = [];
  chats[chatName].forEach(msg=>renderMessage(msg));
  renderGroupSettings();
}

// ====== Render Message ======
function renderMessage(msg){
  const msgBox = document.createElement("div");
  msgBox.className = "message "+ (msg.sender===currentUser.phone ? "sent":"received");
  let content = `<strong>${msg.senderName}</strong><br>`;
  if(msg.type==="text") content += msg.msg;
  if(msg.type==="image") content += `<img src="${msg.file}" style="max-width:200px; border-radius:8px;">`;
  if(msg.type==="voice") content += `<audio controls src="${msg.file}"></audio>`;
  msgBox.innerHTML = content;
  document.getElementById("messages").appendChild(msgBox);
  msgBox.scrollIntoView();
}

// ====== Send Message ======
function sendMessage(){
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  const fileInput = document.getElementById("fileInput");
  if(!text && !fileInput.files.length) return;

  const msgObj = {
    sender: currentUser.phone,
    senderName: currentUser.fullName,
    type: fileInput.files.length ? (fileInput.files[0].type.startsWith("audio")?"voice":"image") : "text",
    msg: text,
    time: new Date().toLocaleTimeString(),
    file: null
  };

  if(fileInput.files.length){
    const reader = new FileReader();
    reader.onload = ()=>{
      msgObj.file = reader.result;
      chats[currentChat].push(msgObj);
      renderMessage(msgObj);
      input.value="";
      fileInput.value="";
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    chats[currentChat].push(msgObj);
    renderMessage(msgObj);
    input.value="";
  }
}

// ====== Enter key ======
document.getElementById("msgInput").addEventListener("keypress", e=>{
  if(e.key==="Enter") sendMessage();
});

// ====== Logout ======
function logout(){
  localStorage.removeItem("user");
  location.reload();
}

// ====== Profile/Settings ======
function openProfile(){
  document.getElementById("profilePage").classList.remove("hidden");
  document.getElementById("settingsPage").classList.add("hidden");
  document.getElementById("homeControls").classList.add("hidden");
}

function openSettings(){
  document.getElementById("settingsPage").classList.remove("hidden");
  document.getElementById("profilePage").classList.add("hidden");
  document.getElementById("homeControls").classList.add("hidden");
}

function saveProfile(){
  currentUser.fullName = document.getElementById("profileName").value.trim();
  currentUser.pin = document.getElementById("profilePin").value.trim();
  localStorage.setItem("user", JSON.stringify(currentUser));
  alert("ذخیره شد!");
}

// ====== Groups ======
function openCreateGroup(){
  document.getElementById("createGroupPage").classList.remove("hidden");
  document.getElementById("homeControls").classList.add("hidden");
}

function createGroup(){
  const groupName = document.getElementById("groupNameInput").value.trim();
  if(!groupName) return alert("نام گروه را وارد کنید!");
  groups[groupName] = {admin: currentUser.phone, members:[currentUser.phone]};
  chats[groupName] = [];
  renderChatList();
  alert("گروه ساخته شد!");
  document.getElementById("createGroupPage").classList.add("hidden");
  document.getElementById("homeControls").classList.remove("hidden");
}

function renderGroupSettings(){
  const settingsDiv = document.getElementById("groupSettings");
  settingsDiv.innerHTML = "";
  if(groups[currentChat] && groups[currentChat].admin===currentUser.phone){
    settingsDiv.innerHTML = `
      <button onclick="renameGroup()">تغییر نام گروه</button>
      <button onclick="changeGroupPhoto()">تغییر عکس گروه</button>
    `;
  }
}

// ====== Group management placeholders ======
function renameGroup(){
  const newName = prompt("نام جدید گروه:");
  if(newName){
    groups[newName] = groups[currentChat];
    chats[newName] = chats[currentChat];
    delete groups[currentChat];
    delete chats[currentChat];
    currentChat = newName;
    renderChatList();
    openChat(newName);
  }
}

function changeGroupPhoto(){
  alert("امکان آپلود عکس گروه بعدا اضافه می‌شود");
}
