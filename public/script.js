const loginBtn = document.getElementById('loginBtn');
const dashboard = document.getElementById('dashboard');
const passwordInput = document.getElementById('password');
const searchInput = document.getElementById('search');
const otpTableBody = document.querySelector('#otpTable tbody');

let AUTH = null;

loginBtn.addEventListener('click', () => {
    if (passwordInput.value === '') return alert('رمز عبور را وارد کنید');
    AUTH = passwordInput.value;
    loadOtps();
    dashboard.style.display = 'block';
    loginBtn.style.display = 'none';
    passwordInput.style.display = 'none';
});

async function loadOtps() {
    if (!AUTH) return;
    const res = await fetch('/api/otps', { headers: { Authorization: AUTH } });
    const data = await res.json();
    renderTable(data);
}

function renderTable(data) {
    otpTableBody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.mobile}</td>
            <td>${item.otp}</td>
            <td>${new Date(item.timestamp).toLocaleString()}</td>
            <td><button onclick="deleteOtp('${item.otp}')">حذف</button></td>
        `;
        otpTableBody.appendChild(tr);
    });
}

async function deleteOtp(otp) {
    if (!AUTH) return;
    await fetch('/api/otps/' + otp, { method: 'DELETE', headers: { Authorization: AUTH } });
    loadOtps();
}

searchInput.addEventListener('input', async () => {
    const term = searchInput.value;
    if (!AUTH) return;
    const res = await fetch('/api/otps', { headers: { Authorization: AUTH } });
    let data = await res.json();
    if (term) data = data.filter(item => item.mobile.includes(term) || item.otp.includes(term));
    renderTable(data);
});
