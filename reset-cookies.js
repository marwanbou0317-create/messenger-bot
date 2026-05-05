/**
 * reset-cookies.js
 * أداة لإعادة تعيين الكوكيز (appstate) من معلومات الحساب
 * 
 * الاستخدام:
 *   node reset-cookies.js
 * 
 * ستطلب منك إدخال:
 * - البريد الإلكتروني أو رقم الهاتف
 * - كلمة المرور
 */

const login = require('ws3-fca');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const APPSTATE_PATH = path.join(__dirname, 'appstate.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n=== أداة إعادة تعيين الكوكيز ===\n');

  const email = await ask('البريد الإلكتروني أو رقم الهاتف: ');
  const password = await ask('كلمة المرور: ');

  console.log('\nجاري تسجيل الدخول...');

  rl.close();

  login(
    {
      email: email.trim(),
      password: password.trim(),
      logLevel: 'error',
      forceLogin: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    (err, api) => {
      if (err) {
        console.error('\n❌ فشل تسجيل الدخول:', err.error || JSON.stringify(err));
        if (err.error === 'login-approval') {
          console.error('يحتاج الحساب إلى موافقة تسجيل الدخول. تحقق من البريد الإلكتروني أو SMS.');
        }
        process.exit(1);
      }

      const appstate = api.getAppState();
      fs.writeFileSync(APPSTATE_PATH, JSON.stringify(appstate, null, 2));
      console.log('\n✅ تم تسجيل الدخول وحفظ الكوكيز الجديدة في appstate.json');
      console.log('يمكنك الآن تشغيل البوت باستخدام: node index.js\n');
      process.exit(0);
    }
  );
}

main().catch((e) => {
  console.error('خطأ:', e.message);
  process.exit(1);
});
