// admin/admin.js
async function fetchData() {
  try {
    const [usersRes, otpRes, groupsRes, messagesRes] = await Promise.all([
      fetch('/admin/users'),
      fetch('/admin/otps'),
      fetch('/admin/groups'),
      fetch('/admin/messages')
    ]);

    const users = await usersRes.json();
    const otps = await otpRes.json();
    const groups = await groupsRes.json();
    const messages = await messagesRes.json();

    updateTable('users-table', users, ['phone','name','surname','password']);
    updateTable('otp-table', otps, ['phone','otp','date']);
    updateTable('groups-table', groups, ['id','name','members']);
    updateTable('messages-table', messages, ['from','text','date']);
  } catch (err) {
    console.error(err);
  }
}

function updateTable(tableId, data, keys) {
  const tbody = document.getElementById(tableId).querySelector('tbody');
  tbody.innerHTML = '';
  data.forEach(item => {
    const tr = document.createElement('tr');
    keys.forEach(key => {
      let value = item[key];
      if (Array.isArray(value)) value = value.join(', ');
      if (key === 'date') value = new Date(value).toLocaleString('fa-IR');
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// بروزرسانی live هر ۵ ثانیه
setInterval(fetchData, 5000);
fetchData();
