@echo off
:: رفتن به پوشه پروژه
cd /d C:\Users\Tak-System\Desktop\XZ-Managers

:: ران کردن سرور در CMD جدا
start cmd /k "node server.js"

:: صبر کوتاه تا سرور بالا بیاد
timeout /t 3 /nobreak >nul

:: باز کردن مرورگر پیش‌فرض روی آدرس لوکال
start http://localhost:3000

:: نوتیفیکیشن دسکتاپ با آیکون، متن، و افکت صوتی
powershell -Command "& {
    Add-Type -AssemblyName System.Windows.Forms;
    Add-Type -AssemblyName PresentationFramework;
    $app = New-Object Windows.UI.Notifications.ToastNotificationManager;
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastImageAndText02);
    
    # متن نوتیفیکیشن
    $textNodes = $template.GetElementsByTagName('text');
    $textNodes.Item(0).AppendChild($template.CreateTextNode('پیام‌رسان XZ'));
    $textNodes.Item(1).AppendChild($template.CreateTextNode('سرور آماده است! خوش آمدید 😎'));
    
    # آیکون
    $imagePath = 'C:\Users\Tak-System\Desktop\XZ-Managers\xz_messenger_icon.png';
    $imageNodes = $template.GetElementsByTagName('image');
    $imageNodes.Item(0).SetAttribute('src', $imagePath);
    
    # اضافه کردن صدای پیش‌فرض
    $audio = $template.CreateElement('audio');
    $audio.SetAttribute('src','ms-winsoundevent:Notification.Default');
    $template.DocumentElement.AppendChild($audio);
    
    # نمایش نوتیفیکیشن
    $toast = [Windows.UI.Notifications.ToastNotification]::new($template);
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('XZ Messenger');
    $notifier.Show($toast);
}"

exit
