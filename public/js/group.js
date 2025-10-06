// groups.js
async function loadGroups(){
  const res = await fetch('/groups'); const data = await res.json();
  const search = (document.getElementById('groupSearch') || {value:''}).value.toLowerCase();
  const list = document.getElementById('groupList'); list.innerHTML='';
  for(const g in data){
    if(search && !g.toLowerCase().includes(search)) continue;
    const div = document.createElement('div'); div.className='item';
    div.innerHTML = `<div style="flex:1"><b>${g}</b><div style="font-size:12px;color:var(--muted)">${data[g].description || ''}</div></div>
      <div><button onclick="enterGroup('${encodeURIComponent(g)}')">چت</button> <button onclick="askDelete('${g}')">حذف</button></div>`;
    list.appendChild(div);
  }
}

async function createGroup(){
  const name = document.getElementById('newGroupName').value.trim();
  const phone = JSON.parse(localStorage.getItem('user')||'{}').phone;
  if(!name) return alert('نام وارد کنید');
  const res = await fetch('/create-group',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupName:name,description:'',creatorPhone:phone})});
  const d = await res.json();
  if(d.success){ loadGroups(); document.getElementById('newGroupName').value=''; } else alert(d.message||'خطا');
}

function enterGroup(g){
  localStorage.setItem('group', decodeURIComponent(g));
  location.href='chat.html';
}

async function askDelete(g){
  const phone = JSON.parse(localStorage.getItem('user')||'{}').phone;
  if(!confirm('آیا مطمئنید حذف شود؟')) return;
  const res = await fetch('/delete-group',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupName:g, requester:phone})});
  const d = await res.json(); if(d.success) loadGroups(); else alert(d.message||'خطا');
}

function logout(){ localStorage.removeItem('user'); location.href='index.html'; }

loadGroups();
