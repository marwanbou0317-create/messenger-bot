const log = require('../utils/logger');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// تغيير كنية واحدة — يجرب Promise أولاً ثم callback
async function setNick(api, nickname, threadID, uid) {
  // المحاولة الأولى: Promise مباشر
  try {
    const result = api.changeNickname(nickname, threadID, uid);
    if (result && typeof result.then === 'function') {
      await result;
      return true;
    }
  } catch (e) {
    log.error(`setNick Promise خطأ لـ ${uid}: ${e.message}`);
  }

  // المحاولة الثانية: callback كلاسيك
  return new Promise((resolve) => {
    try {
      api.changeNickname(nickname, threadID, uid, (err) => {
        if (err) {
          log.error(`setNick callback خطأ لـ ${uid}: ${JSON.stringify(err)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
      // timeout بعد 10 ثواني إذا لم يرد الـ callback
      setTimeout(() => resolve(false), 10000);
    } catch (e) {
      log.error(`setNick استثناء لـ ${uid}: ${e.message}`);
      resolve(false);
    }
  });
}

// تغيير كنية مع إعادة محاولة حتى 3 مرات
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
  const subCmd = (args[0] || '').trim();

  // ── كنية الكل ──
  if (subCmd === 'الكل' || subCmd === 'all') {
    const nicknameText = args.slice(1).join(' ').trim();
    const isReset = !nicknameText || nicknameText.toLowerCase() === 'reset' || nicknameText === 'مسح';
    const nickname = isReset ? '' : nicknameText;

    api.getThreadInfo(threadID, async (err, info) => {
      if (err || !info) {
        return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);
      }

      const members = info.participantIDs || [];
      if (!members.length) return api.sendMessage('⚠️ لا يوجد أعضاء.', threadID);

      api.sendMessage(`⏳ جاري المعالجة لـ ${members.length} عضو...`, threadID);

      let done = 0, fail = 0;

      for (let i = 0; i < members.length; i++) {
        if (i > 0 && i % 5 === 0) await sleep(15000);
        else if (i > 0) await sleep(5000 + Math.random() * 3000);

        const ok = await setNickRetry(api, nickname, threadID, members[i]);
        ok ? done++ : fail++;
      }

      api.sendMessage(
        `✅ اكتمل!\n` +
        `نجح: ${done} عضو${fail ? `\nفشل: ${fail} عضو` : ''}`,
        threadID
      );
    });
    return;
  }

  // ── كنية @شخص ──
  const mentions = event.mentions || {};
  const ids = Object.keys(mentions);

  if (!ids.length) {
    return api.sendMessage(
      `📝 الاستخدام:\n` +
      `/كنية @شخص [كنية] — تعيين\n` +
      `/كنية @شخص reset — مسح\n` +
      `/كنية الكل [كنية] — للجميع\n` +
      `/كنية الكل reset — مسح الجميع`,
      threadID
    );
  }

  const targetID = ids[0];
  const targetName = mentions[targetID] || '';
  const words = Math.max(1, targetName.trim().split(/\s+/).length);
  const nicknameText = args.slice(words).join(' ').trim();
  const isReset = !nicknameText || nicknameText.toLowerCase() === 'reset' || nicknameText === 'مسح';
  const nickname = isReset ? '' : nicknameText;

  const ok = await setNickRetry(api, nickname, threadID, targetID);

  api.sendMessage(
    ok
      ? isReset ? `✅ تم مسح كنية ${targetName}.` : `✅ تم تعيين كنية ${targetName}: "${nickname}"`
      : `❌ فشل تغيير الكنية بعد 3 محاولات.`,
    threadID
  );
}

module.exports = { handle };