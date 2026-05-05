const log = require('../utils/logger');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function setNick(api, nickname, threadID, uid) {
  // المحاولة الأولى: Promise مباشر
  try {
    const result = api.changeNickname(nickname, threadID, uid);
    if (result && typeof result.then === 'function') {
      await result;
      return true;
    }
  } catch (e) {
    log.error(`nicknames Promise خطأ لـ ${uid}: ${e.message}`);
  }

  // المحاولة الثانية: callback مع timeout
  return new Promise((resolve) => {
    try {
      api.changeNickname(nickname, threadID, uid, (err) => {
        if (err) {
          log.error(`nicknames callback خطأ لـ ${uid}: ${JSON.stringify(err)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
      setTimeout(() => resolve(false), 10000);
    } catch (e) {
      log.error(`nicknames استثناء لـ ${uid}: ${e.message}`);
      resolve(false);
    }
  });
}

async function setNickRetry(api, nickname, threadID, uid) {
  for (let i = 1; i <= 3; i++) {
    const ok = await setNick(api, nickname, threadID, uid);
    if (ok) return true;
    if (i < 3) await sleep(5000 * i);
  }
  return false;
}

async function handle(event, api, args) {
  const threadID = event.threadID;
  const input = args.join(' ').trim();

  if (!input) {
    return api.sendMessage(
      `📝 الاستخدام:\n` +
      `/كنيات [نص] — نفس الكنية للجميع\n` +
      `/كنيات reset — مسح كنيات الجميع\n\n` +
      `مثال: /كنيات عضو VIP`,
      threadID
    );
  }

  const isReset = input.toLowerCase() === 'reset' || input === 'مسح';
  const nickname = isReset ? '' : input;

  api.getThreadInfo(threadID, async (err, info) => {
    if (err || !info) {
      return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);
    }

    const members = info.participantIDs || [];
    if (!members.length) return api.sendMessage('⚠️ لا يوجد أعضاء.', threadID);

    api.sendMessage(
      `⏳ جاري ${isReset ? 'مسح' : `تعيين "${nickname}"`} لـ ${members.length} عضو...`,
      threadID
    );

    let done = 0, fail = 0;

    for (let i = 0; i < members.length; i++) {
      // توقف أطول كل 5 أعضاء
      if (i > 0 && i % 5 === 0) await sleep(15000);
      else if (i > 0) await sleep(5000 + Math.random() * 3000);

      const ok = await setNickRetry(api, nickname, threadID, members[i]);
      ok ? done++ : fail++;

      // تحديث كل 10
      if (done > 0 && done % 10 === 0) {
        api.sendMessage(`⏳ تم ${done} من ${members.length}...`, threadID);
      }
    }

    api.sendMessage(
      `✅ اكتمل!\n` +
      (isReset
        ? `مُسح: ${done} عضو`
        : `تم تعيين "${nickname}": ${done} عضو`) +
      (fail ? `\nفشل: ${fail} عضو` : ''),
      threadID
    );
  });
}

module.exports = { handle };