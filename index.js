const login = require('ws3-fca');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const log = require('./utils/logger');
const { isAdmin, isSuperAdmin } = require('./utils/admin');
const { isLocked, markActivity } = require('./utils/state');
const { setStartTime } = require('./commands/server');

const engineCmd = require('./commands/engine');
const lockCmd = require('./commands/lock');
const promoteCmd = require('./commands/promote');
const demoteCmd = require('./commands/demote');
const helpCmd = require('./commands/help');
const serverCmd = require('./commands/server');

const APPSTATE_PATH = path.join(__dirname, 'appstate.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');

let reconnectAttempts = 0;
let globalApi = null;

function loadAppstate() {
  try {
    const raw = fs.readFileSync(APPSTATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      log.error('ملف appstate.json فارغ أو غير صحيح.');
      return null;
    }
    return parsed;
  } catch (e) {
    log.error('فشل تحميل appstate.json: ' + e.message);
    return null;
  }
}

function saveAppstate(state) {
  try {
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(state, null, 2));
    log.success('تم حفظ appstate الجديد.');
  } catch (e) {
    log.error('فشل حفظ appstate: ' + e.message);
  }
}

function handleCommand(event, api) {
  const body = event.body || '';
  const prefix = config.prefix;

  if (!body.startsWith(prefix)) return false;

  const threadID = event.threadID;
  const senderID = event.senderID;

  const locked = isLocked(threadID);
  if (locked && !isAdmin(senderID)) {
    return true;
  }

  const withoutPrefix = body.slice(prefix.length).trim();
  const parts = withoutPrefix.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  log.bot(`Command [${cmd}] from ${senderID} in ${threadID}`);

  switch (cmd) {
    case 'اوامر':
    case 'أوامر':
    case 'help':
      helpCmd.handle(event, api, args, prefix);
      break;

    case 'محرك':
    case 'engine':
      engineCmd.handle(event, api, args, prefix);
      break;

    case 'قفل':
    case 'lock':
      lockCmd.handle(event, api, args, prefix);
      break;

    case 'رفع':
    case 'promote':
      promoteCmd.handle(event, api, args);
      break;

    case 'اخفاض':
    case 'خفض':
    case 'demote':
      demoteCmd.handle(event, api, args);
      break;

    case 'سيرفر':
    case 'server':
      serverCmd.handleServer(event, api);
      break;

    case 'ابتيم':
    case 'uptime':
      serverCmd.handleUptime(event, api);
      break;

    default:
      return false;
  }

  return true;
}

function handleEvent(event, api) {
  const threadID = event.threadID;

  const activityTypes = [
    'change_thread_name',
    'change_group_image',
    'change_nickname',
    'change_thread_color',
    'change_thread_icon',
    'add_participants',
    'remove_participants',
    'log:subscribe',
    'log:unsubscribe',
  ];

  if (activityTypes.includes(event.type)) {
    markActivity(threadID);
  }
}

function startBot() {
  const appstate = loadAppstate();

  if (!appstate) {
    log.error('لا يمكن بدء البوت بدون appstate صحيح.');
    log.info('ضع ملف appstate.json الصحيح ثم أعد التشغيل.');
    return;
  }

  log.info('جاري تسجيل الدخول...');

  const loginOptions = {
    appState: appstate,
    logLevel: config.logLevel || 'error',
    online: config.online !== false,
    selfListen: config.selfListen === true,
    listenEvents: config.listenEvents !== false,
    autoMarkRead: config.autoMarkRead === true,
    autoMarkDelivery: config.autoMarkDelivery === true,
    forceLogin: config.forceLogin === true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  login(loginOptions, (err, api) => {
    if (err) {
      log.error('فشل تسجيل الدخول: ' + (err.error || JSON.stringify(err)));
      scheduleReconnect();
      return;
    }

    reconnectAttempts = 0;
    globalApi = api;
    setStartTime(Date.now());

    saveAppstate(api.getAppState());
    log.success('تم تسجيل الدخول بنجاح!');
    log.info('البوت يعمل الآن. البادئة: ' + config.prefix);

    api.setOptions({
      listenEvents: config.listenEvents !== false,
      selfListen: config.selfListen === true,
      logLevel: config.logLevel || 'error',
    });

    const stopListening = api.listenMqtt((err, event) => {
      if (err) {
        log.error('خطأ في الاستماع: ' + JSON.stringify(err));
        if (
          err.error === 'Not logged in' ||
          err.error === 'Connection closed' ||
          err.type === 'stop_listen'
        ) {
          log.warn('تم قطع الاتصال. إعادة الاتصال...');
          try { stopListening(); } catch (_) {}
          scheduleReconnect();
        }
        return;
      }

      if (!event) return;

      if (event.type === 'message' || event.type === 'message_reply') {
        markActivity(event.threadID);

        const isLock = isLocked(event.threadID);
        if (isLock && !isAdmin(event.senderID)) return;

        handleCommand(event, api);
      } else if (event.type === 'event') {
        handleEvent(event, api);
      }
    });

    setInterval(() => {
      saveAppstate(api.getAppState());
    }, 10 * 60 * 1000);
  });
}

function scheduleReconnect() {
  const maxAttempts = config.maxReconnectAttempts;
  if (maxAttempts > 0 && reconnectAttempts >= maxAttempts) {
    log.error(`وصل إلى الحد الأقصى من محاولات إعادة الاتصال (${maxAttempts}).`);
    process.exit(1);
  }

  reconnectAttempts++;
  const delay = config.reconnectDelay || 5000;
  log.warn(`إعادة الاتصال بعد ${delay / 1000} ثانية... (محاولة ${reconnectAttempts})`);
  setTimeout(() => startBot(), delay);
}

process.on('uncaughtException', (err) => {
  log.error('استثناء غير مُعالج: ' + err.message);
  log.error(err.stack || '');
});

process.on('unhandledRejection', (reason) => {
  log.error('رفض وعد غير مُعالج: ' + reason);
});

process.on('SIGINT', () => {
  log.warn('تم إيقاف البوت يدوياً.');
  if (globalApi) {
    try { globalApi.logout(() => process.exit(0)); } catch (_) { process.exit(0); }
  } else {
    process.exit(0);
  }
});

log.info('='.repeat(40));
log.info(`  ${config.botName} - Facebook Messenger Bot`);
log.info('='.repeat(40));

startBot();
