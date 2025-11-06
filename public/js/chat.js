// public/js/chat.js
let ws;
function initWS(){
  ws = new WebSocket((location.protocol==='https:'?'wss://':'ws://') + location.host);
  ws.onopen = ()=> console.log('ws open');
  ws.onmessage = (ev)=>{
    try{
      const data = JSON.parse(ev.data);
      if(data.type === 'group'){
        const current = localStorage.getItem('currentGroup');
        if(data.group === current) addMessage(data.user, data.message);
        // notification:
        const me = localStorage.getItem('phone');
        if(data.user !== me){
          if(Notification.permission==='granted') new Notification(`پیام از ${data.user}`, { body: data.message });
          else Notification.requestPermission().then(p=>{ if(p==='granted') new Notification(`پیام از ${data.user}`, { body:data.message }); });
        }
      }
    }catch(e){}
  };
}
function addMessage(user, message){
  const el = document.createElement('div');
  const me = localStorage.getItem('phone');
  el.className = 'message ' + (user===me ? 'sent':'received');
  el.innerText = `${user}: ${message}`;
  document.getElementById('messages').appendChild(el);
  el.scrollIntoView();
}
function sendMessage(){
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if(!text) return;
  const group = localStorage.getItem('currentGroup');
  const user = localStorage.getItem('phone') || 'anonymous';
  const payload = { type:'group', group, user, message: text };
  ws.send(JSON.stringify(payload));
  addMessage(user, text);
  input.value = '';
}

// MediaRecorder for voice
let mediaRecorder, audioChunks=[];
async function toggleRecord(){
  if(mediaRecorder && mediaRecorder.state === 'recording'){ mediaRecorder.stop(); return; }
  const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type:'audio/webm' });
    audioChunks = [];
    const fd = new FormData();
    fd.append('voice', blob, 'voice.webm');
    const res = await fetch('/api/upload-voice', { method:'POST', body: fd }).then(r=>r.json());
    if(res.success){
      const url = res.url;
      const group = localStorage.getItem('currentGroup');
      const user = localStorage.getItem('phone') || 'anonymous';
      const payload = { type:'group', group, user, message: `[ویس] ${url}`, meta:{ voice: url } };
      ws.send(JSON.stringify(payload));
      addMessage(user, '[ویس ارسال شد]');
    }
  };
  mediaRecorder.start();
}

// اینتر برای ارسال
document.addEventListener('keydown', e => {
  if(e.key === 'Enter'){
    const focused = document.activeElement;
    if(focused && focused.id === 'msgInput'){ sendMessage(); }
  }
});

window.addEventListener('load', ()=> initWS());
