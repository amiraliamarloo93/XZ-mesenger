document.getElementById('loginForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    let phone = document.getElementById('loginPhone').value;
    let pass = document.getElementById('loginPass').value;
    alert(`ورود با شماره ${phone}`);
});

document.getElementById('registerForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    let phone = document.getElementById('regPhone').value;
    alert(`ارسال OTP به شماره ${phone}`);
});

function saveProfile() {
    let name = document.getElementById('profileName').value;
    let family = document.getElementById('profileFamily').value;
    let pass = document.getElementById('profilePass').value;
    alert(`پروفایل ذخیره شد: ${name} ${family}`);
}
