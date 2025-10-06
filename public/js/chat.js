// chat.js
let ws;
let currentGroup = localStorage.getItem('group') || null;
const phone = (JSON.parse(localStorage.getItem('user')||'{}').phone) || null;

function connectWS(){
  ws = new WebSocket(`ws://${location.hostname}:${location.port || 3000}`);
  ws.onopen = ()=> { if(phone) ws.send(JSON.stringify({type:'identify', user: phone})); };
  ws.onmessage = (ev) => {
    const d = JSON.parse(ev.data);
    if(d.type==='group' && d.group === currentGroup){
      addMessage(d.chatMsg.user, d.chatMsg.message, d.chatMsg.type === 'voice', d.chatMsg);
      notifyIfNeeded(d.chatMsg.user, d.chatMsg.message);
    }
    if(d.type==='voice' && d.group === currentGroup){
      addMessage(d.chatMsg.user, '[Voice]', true, d.chatMsg);
    }
  };
}

function addMessage(user, text, isVoice=false, obj){
  const el = document.createElement('div'); el.className = user===phone ? 'message sent' : 'message received';
  if(isVoice && obj && obj.uri){
    el.innerHTML = `<strong>${user}</strong><br/><audio controls src="${obj.uri}"></audio>`;
  } else {
    el.innerHTML = `<strong>${user}</strong><br/>${text}`;
  }
  document.getElementById('messages').appendChild(el); el.scrollIntoView();
}

function sendText(){ const v=document.getElementById('messageInput'); const txt=v.value.trim(); if(!txt) return; if(!currentGroup) return alert('گروه انتخاب نشده');
  const payload = { type:'group', group: currentGroup, user: phone, message: txt };
  ws.send(JSON.stringify(payload));
  addMessage(phone, txt);
  v.value=''; 
}

function onKey(e){ if(e.key==='Enter'){ e.preventDefault(); sendText(); } }

function notifyIfNeeded(user, text){
  if(user===phone) return;
  if(Notification.permission==='granted') new Notification(`پیام از ${user}`, { body: text });
}

document.getElementById && (() => {
  if(!currentGroup){
    document.getElementById('chatTitle').innerText = 'یک گفتگو انتخاب کنید';
  } else {
    document.getElementById('chatTitle').innerText = currentGroup;
  }
  connectWS();

  // file send (images)
  const fileInput = document.getElementById('fileInput');
  fileInput && fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if(!f) return;
    // convert to base64 and send as group text with image dataURI (simple)
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result; // data:image/...
      const payload = { type:'group', group: currentGroup, user: phone, message: '[Image]', extra:{ image: data } };
      ws.send(JSON.stringify(payload)); // server currently stores only text; clients receiving image optional
      addMessage(phone, `<img src="${data}" style="max-width:220px;border-radius:8px">`);
    };
    reader.readAsDataURL(f);
  });

  // mic recording (voice)
  const mic = document.getElementById('micBtn');
  if(mic){
    let recorder, chunks=[];
    mic.addEventListener('click', async ()=> {
      if(!navigator.mediaDevices) return alert('مرورگر شما از ضبط پشتیبانی نمیکند');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        chunks=[];
        // announce voice upload
        const id = 'v-' + Math.random().toString(36).slice(2,9);
        ws.send(JSON.stringify({ type:'voice-announce', group: currentGroup, user: phone, id, mime: blob.type }));
        // send binary
        const arrayBuffer = await blob.arrayBuffer();
        ws.send(arrayBuffer);
        addMessage(phone, '[Voice recorded]');
      };
      recorder.start();
      mic.innerText = '● ضبط... کلیک کن برای پایان';
      mic.onclick = () => { recorder.stop(); mic.innerText='🎤'; mic.onclick = null; }
    });
  }
})();
