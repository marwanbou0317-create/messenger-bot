const log = require('../utils/logger');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getThread(api, threadID) {
  try {
    const r = api.getThreadInfo(threadID);
    if (r && typeof r.then === 'function') return await r;
  } catch (_) {}
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 15000);
    try {
      api.getThreadInfo(threadID, (err, info) => {
        clearTimeout(timer);
        resolve(err ? null : info);
      });
    } catch (e) { clearTimeout(timer); resolve(null); }
  });
}

// نسخة تشخيصية — ترسل الخطأ الحقيقي للشات
async function diagNick(api, nickname, threadID, uid) {
  // اختبر Promise أولاً
  try {
    const r = api.changeNickname(nickname, threadID, uid);
    if (r && typeof r.then === 'function') {
      try {
        await r;
        return { ok: true, method: 'promise' };
      } catch (e) {
        return { ok: false, method: 'promise', err: e.message };
      }
    }
    // ليست promise، سجّل النوع
    const rType = r === undefined ? 'undefined' : (r === null ? 'null' : typeof r);
    log.bot('changeNickname returned: ' + rType);
  } catch (e) {
    return { ok: false, method: 'promise-throw', err: e.message };
  }

  // جرب callback
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, method: 'callback', err: 'timeout 10s' }), 10000);
    try {
      api.changeNickname(nickname, threadID, uid, (err) => {
        clearTimeout(timer);
        if (err) {
          const errStr = typeof err === 'object' ? JSON.stringify(err) : String(err);
          resolve({ ok: false, method: 'callback', err: errStr });
        } else {
          resolve({ ok: true, method: 'callback' });
        }
      });
    } catch (e) {
      clearTimeout(timer);
      resolve({ ok: false, method: 'callback-throw', err: e.message });
    }
  });
}

async function handle(event, api, args) {
  const threadID = event.threadID;
  const input = args.join(' ').trim();

  if (!input) {
    return api.sendMessage(
      `/كنيات [نص] — نفس الكنية للجميع\n` +
      `/كنيات reset — مسح كنيات الجميع\n\n` +
      `مثال: /كنيات VIP`,
      threadID
    );
  }

  const isReset = input.toLowerCase() === 'reset' || input === 'مسح';
  const nickname = isReset ? '' : input;

  api.sendMessage('⏳ جاري جلب أعضاء المجموعة...', threadID);

  const info = await getThread(api, threadID);
  if (!info) return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);

  const members = info.participantIDs || [];
  if (!members.length) return api.sendMessage('⚠️ لا يوجد أعضاء.', threadID);

  // اختبر على أول عضو فقط وأرسل النتيجة
  api.sendMessage(`🔍 وجدت ${members.length} عضو. جاري اختبار أول عضو (${members[0]})...`, threadID);

  const result = await diagNick(api, nickname, threadID, members[0]);

  if (!result.ok) {
    return api.sendMessage(
      `❌ فشل تغيير الكنية\nالطريقة: ${result.method}\nالخطأ: ${result.err}`,
      threadID
    );
  }

  // نجح الاختبار — كمّل على الباقين
  api.sendMessage(`✅ نجح الاختبار (${result.method}). جاري المعالجة لـ ${members.length} عضو...`, threadID);

  let done = 1, fail = 0;

  for (let i = 1; i < members.length; i++) {
    if (i % 5 === 0) await sleep(15000);
    else await sleep(5000 + Math.random() * 3000);

    const r = await diagNick(api, nickname, threadID, members[i]);
    r.ok ? done++ : fail++;
  }

  api.sendMessage(
    `✅ اكتمل!\n` +
    (isReset ? `مُسح: ${done}` : `تم تعيين "${nickname}": ${done}`) +
    (fail ? `\nفشل: ${fail}` : ''),
    threadID
  );
}

module.exports = { handle };