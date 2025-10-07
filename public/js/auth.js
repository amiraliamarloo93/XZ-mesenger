// ==========================================================
// JS مدیریت فرم‌های پیام‌رسان XZ
// نویسنده: امیرعلی عمارلو و ChatGPT
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToLogin = document.getElementById('switch-to-login');
    const switchToRegister = document.getElementById('switch-to-register');
    const otpDisplay = document.getElementById('otp-display');

    // سوئیچ فرم‌ها
    switchToLogin.addEventListener('click', () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    switchToRegister.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    // ذخیره OTPها به صورت موقت
    const otpStore = {}; // ساختار: { '09157726080': '1234' }

    // تولید OTP
    function generateOTP() {
        return Math.floor(1000 + Math.random() * 9000).toString(); // ۴ رقمی
    }

    // بررسی شماره موبایل
    function validatePhone(phone) {
        const phoneRegex = /^09\d{9}$/;
        return phoneRegex.test(phone);
    }

    // بررسی رمز ۴ رقمی
    function validatePIN(pin) {
        const pinRegex = /^\d{4}$/;
        return pinRegex.test(pin);
    }

    // ارسال OTP برای ثبت‌نام
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('reg-phone').value.trim();
        const firstName = document.getElementById('reg-firstname').value.trim();
        const lastName = document.getElementById('reg-lastname').value.trim();
        const pin = document.getElementById('reg-pin').value.trim();

        if (!validatePhone(phone)) {
            alert('شماره موبایل صحیح نیست!');
            return;
        }
        if (!validatePIN(pin)) {
            alert('رمز باید ۴ رقمی باشد!');
            return;
        }
        if (!firstName || !lastName) {
            alert('نام و نام خانوادگی را وارد کنید!');
            return;
        }

        const otp = generateOTP();
        otpStore[phone] = otp;
        otpDisplay.textContent = `کد OTP برای شماره ${phone}: ${otp}`;
        alert(`کد OTP تولید شد و در بخش OTP نمایش داده می‌شود.`);
    });

    // ورود با OTP
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('login-phone').value.trim();
        const pin = document.getElementById('login-pin').value.trim();
        const otpInput = document.getElementById('login-otp').value.trim();

        if (!validatePhone(phone)) {
            alert('شماره موبایل صحیح نیست!');
            return;
        }
        if (!validatePIN(pin)) {
            alert('رمز باید ۴ رقمی باشد!');
            return;
        }
        if (!otpInput || otpInput !== otpStore[phone]) {
            alert('OTP اشتباه است یا هنوز تولید نشده!');
            return;
        }

        alert(`ورود موفق برای شماره ${phone}`);
        // بعداً اینجا می‌توان به صفحه اصلی پیام‌رسان ریدایرکت کرد
    });
});
