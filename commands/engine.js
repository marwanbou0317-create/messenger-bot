const { isAdmin } = require('../utils/admin');
const {
  engineState,
  setEngineEnabled,
  setEngineMessage,
  setEngineInterval,
  setEngineSmart,
  setEngineTarget,
  markActivity,
  hasActivity,
  clearActivity,
} = require('../utils/state');
const { engineDelay } = require('../utils/delay');
const log = require('../utils/logger');

let currentApi = null;

function setApi(api) {
  currentApi = api;
}

function startEngineTimer() {
  if (engineState.timers.has('main')) {
    clearInterval(engineState.timers.get('main'));
    engineState.timers.delete('main');
  }

  if (!engineState.enabled || !engineState.targetThreadID) return;

  // استخدام setTimeout بدلاً من setInterval لإضافة عشوائية في التوقيت
  function scheduleNext() {
    if (!engineState.enabled || !engineState.targetThreadID) return;

    // تأخير عشوائي +-20% من الوقت المحدد
    engineDelay(engineState.intervalSeconds).then(() => {
      if (!engineState.enabled || !currentApi || !engineState.targetThreadID) return;

      if (engineState.smart) {
        if (!hasActivity(engineState.targetThreadID)) {
          scheduleNext();
          return;
        }
        clearActivity(engineState.targetThreadID);
      }

      currentApi.sendMessage(engineState.message, engineState.targetThreadID, (err) => {
        if (err) log.error('Engine send error: ' + err);
      });

      scheduleNext();
    });
  }

  // نبدأ الدورة الأولى
  const timerRef = { active: true };
  engineState.timers.set('main', timerRef);
  scheduleNext();
}

function stopEngineTimer() {
  if (engineState.timers.has('main')) {
    const ref = engineState.timers.get('main');
    if (ref && typeof ref === 'object') ref.active = false;
    else clearInterval(ref);
    engineState.timers.delete('main');
  }
}

function handle(event, botApi, args, prefix) {
  setApi(botApi);

  const senderID = event.senderID;
  const threadID = event.threadID;
  const subCmd = args[0] ? args[0].toLowerCase() : '';

  if (!subCmd) {
    if (engineState.enabled) {
      stopEngineTimer();
      setEngineEnabled(false);
      log.bot('Engine stopped by ' + senderID);
      return botApi.sendMessage('🔴 تم إيقاف المحرك.', threadID);
    } else {
      if (!engineState.targetThreadID) setEngineTarget(threadID);
      setEngineEnabled(true);
      startEngineTimer();
      log.bot('Engine started by ' + senderID);
      return botApi.sendMessage(
        `🟢 تم تشغيل المحرك.\n📍 المجموعة: ${engineState.targetThreadID}\n⏱ كل: ~${engineState.intervalSeconds} ثانية (±20% عشوائي)\n💬 الرسالة: ${engineState.message}\n🧠 الذكي: ${engineState.smart ? 'مفعل' : 'موقوف'}`,
        threadID
      );
    }
  }

  if (subCmd === 'رسالة' || subCmd === 'message') {
    const msg = args.slice(1).join(' ');
    if (!msg) return botApi.sendMessage('❗ أرسل الرسالة بعد الأمر.\nمثال: /محرك رسالة مرحباً', threadID);
    setEngineMessage(msg);
    return botApi.sendMessage(`✅ تم تعيين رسالة المحرك:\n"${msg}"`, threadID);
  }

  if (subCmd === 'وقت' || subCmd === 'time') {
    const secs = parseInt(args[1]);
    if (isNaN(secs) || secs < 10) return botApi.sendMessage('❗ الحد الأدنى 10 ثواني لتجنب الحظر.\nمثال: /محرك وقت 30', threadID);
    setEngineInterval(secs);
    if (engineState.enabled) startEngineTimer();
    return botApi.sendMessage(`✅ تم تعيين وقت المحرك: ~${secs} ثانية (±20% عشوائي).`, threadID);
  }

  if (subCmd === 'الذكي' || subCmd === 'smart') {
    const newVal = !engineState.smart;
    setEngineSmart(newVal);
    return botApi.sendMessage(
      newVal
        ? '🧠 تم تفعيل وضع الذكي.\nسيرسل المحرك فقط عند وجود نشاط في المجموعة.'
        : '🧠 تم إيقاف وضع الذكي.',
      threadID
    );
  }

  if (subCmd === 'تشغيل' || subCmd === 'on') {
    if (engineState.enabled) return botApi.sendMessage('⚠️ المحرك يعمل بالفعل.', threadID);
    if (!engineState.targetThreadID) setEngineTarget(threadID);
    setEngineEnabled(true);
    startEngineTimer();
    log.bot('Engine started by ' + senderID);
    return botApi.sendMessage(`🟢 تم تشغيل المحرك.`, threadID);
  }

  if (subCmd === 'ايقاف' || subCmd === 'إيقاف' || subCmd === 'off') {
    if (!engineState.enabled) return botApi.sendMessage('⚠️ المحرك متوقف بالفعل.', threadID);
    stopEngineTimer();
    setEngineEnabled(false);
    log.bot('Engine stopped by ' + senderID);
    return botApi.sendMessage('🔴 تم إيقاف المحرك.', threadID);
  }

  if (subCmd === 'حالة' || subCmd === 'status') {
    return botApi.sendMessage(
      `📊 حالة المحرك:\n` +
      `▪️ الحالة: ${engineState.enabled ? '🟢 يعمل' : '🔴 متوقف'}\n` +
      `▪️ الرسالة: ${engineState.message}\n` +
      `▪️ الوقت: ~${engineState.intervalSeconds}ث (±20% عشوائي)\n` +
      `▪️ الذكي: ${engineState.smart ? '✅ مفعل' : '❌ موقوف'}\n` +
      `▪️ المجموعة: ${engineState.targetThreadID || 'غير محدد'}`,
      threadID
    );
  }

  return botApi.sendMessage(
    `⚙️ أوامر المحرك:\n` +
    `${prefix}محرك — تشغيل/إيقاف\n` +
    `${prefix}محرك رسالة [نص] — تحديد الرسالة\n` +
    `${prefix}محرك وقت [ثواني] — تحديد الوقت (min: 10)\n` +
    `${prefix}محرك الذكي — تفعيل/إيقاف الذكي\n` +
    `${prefix}محرك حالة — عرض الحالة`,
    threadID
  );
}

module.exports = { handle, setApi, startEngineTimer, stopEngineTimer };
module.exports.markActivityForEngine = markActivity;
