// public/js/groups.js
async function loadGroups(){
  const res = await fetch('/api/groups').then(r=>r.json());
  const list = document.getElementById('groupList');
  list.innerHTML = '';
  for(const name in res){
    const g = res[name];
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><b>${name}</b><div style="font-size:12px;color:#aaa">${g.description||''}</div></div>
      <div>
        <button onclick="enterGroup('${escapeJs(name)}')">چت</button>
        <button onclick="deleteGroup('${escapeJs(name)}')">حذف</button>
      </div>
    </div>`;
    list.appendChild(div);
  }
}
function escapeJs(s){ return s.replace(/'/g,"\\'"); }

async function createGroup(){
  const name = document.getElementById('newGroupName').value.trim();
  if(!name) return alert('نام وارد کن');
  const phone = localStorage.getItem('phone') || 'unknown';
  const res = await fetch('/api/create-group', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ groupName:name, description:'', creatorPhone:phone })}).then(r=>r.json());
  if(res.success){ loadGroups(); alert('ساخته شد'); } else alert(res.message || 'خطا');
}
async function deleteGroup(name){
  if(!confirm('آیا حذف شود؟')) return;
  await fetch('/api/delete-group', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ groupName:name })});
  loadGroups();
}

function enterGroup(name){
  localStorage.setItem('currentGroup', name);
  // نمایش عنوان
  document.getElementById('selectedTitle').innerText = name;
  // بارگذاری پیام‌ها از DB (در این نسخه client از طریق WebSocket پیام می‌گیرد و server ذخیره می‌کند)
  document.getElementById('messages').innerHTML = '';
  // بارگذاری پیام‌های قبلی
  fetch('/api/groups').then(r=>r.json()).then(db=>{
    if(db[name] && db[name].messages){
      db[name].messages.forEach(m=>{
        addMessage(m.user, m.message);
      });
    }
  });
}

function openProfile(){ window.location.href='/profile.html'; }
function openAdmin(){ window.location.href='/admin.html'; }

window.addEventListener('load', ()=> loadGroups());
