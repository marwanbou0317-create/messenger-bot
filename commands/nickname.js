const { isAdmin } = require('../utils/admin');
const { randomDelay, replyDelay } = require('../utils/delay');
const log = require('../utils/logger');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// محاولة تغيير كنية مع إعادة المحاولة تلقائياً
async function changeNickWithRetry(api, nickname, threadID, uid, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const success = await new Promise((resolve) => {
      try {
        api.changeNickname(nickname, threadID, uid, (err) => {
          if (err) {
            log.error(`nickname [${attempt}/${maxRetries}] فشل للمستخدم ${uid}: ${JSON.stringify(err)}`);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (e) {
        log.error(`nickname [${attempt}/${maxRetries}] استثناء للمستخدم ${uid}: ${e.message}`);
        resolve(false);
      }
    });

    if (success) return true;

    // انتظار أطول بين كل محاولة فاشلة
    if (attempt < maxRetries) {
      const waitMs = attempt * 4000 + Math.floor(Math.random() * 3000);
      log.bot(`nickname: انتظار ${waitMs}ms قبل إعادة المحاولة للمستخدم ${uid}`);
      await sleep(waitMs);
    }
  }
  return false;
}

async function handle(event, api, args) {
  const senderID = event.senderID;
  const threadID = event.threadID;

  if (!isAdmin(senderID)) {
    return api.sendMessage('❌ ليس لديك صلاحية استخدام هذا الأمر.', threadID);
  }

  const subCmd = (args[0] || '').trim();

  // ── /كنية الكل [نص|reset] ──
  if (subCmd === 'الكل' || subCmd === 'all') {
    const nicknameText = args.slice(1).join(' ').trim();
    const isReset = !nicknameText || nicknameText.toLowerCase() === 'reset' || nicknameText === 'مسح';
    const nickname = isReset ? '' : nicknameText;

    await replyDelay();

    api.getThreadInfo(threadID, async (err, info) => {
      if (err || !info) {
        log.error('nickname/الكل: فشل getThreadInfo: ' + JSON.stringify(err));
        return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);
      }

      const participants = info.participantIDs || [];
      if (participants.length === 0) {
        return api.sendMessage('⚠️ لا يوجد أعضاء في المجموعة.', threadID);
      }

      api.sendMessage(
        `⏳ جاري ${isReset ? 'مسح كنيات' : `تعيين كنية "${nickname}" لـ`} ${participants.length} عضو...\n(دفعات بتأخير لتجنب الحظر)`,
        threadID
      );

      let done = 0;
      let failed = 0;
      const BATCH = 5;

      for (let i = 0; i < participants.length; i++) {
        // توقف أطول بين كل دفعة
        if (i > 0 && i % BATCH === 0) {
          const pause = 12000 + Math.floor(Math.random() * 8000);
          log.bot(`nickname/الكل: توقف دفعة ${pause}ms`);
          await sleep(pause);
        } else if (i > 0) {
          await randomDelay(4000, 8000);
        }

        const uid = participants[i];
        const success = await changeNickWithRetry(api, nickname, threadID, uid);
        if (success) { done++; } else { failed++; }
      }

      api.sendMessage(
        isReset
          ? `✅ تم مسح كنيات ${done} عضو.${failed ? `\n⚠️ فشل: ${failed} عضو` : ''}`
          : `✅ تم تعيين كنية "${nickname}" لـ ${done} عضو.${failed ? `\n⚠️ فشل: ${failed} عضو` : ''}`,
        threadID
      );
    });

    return;
  }

  // ── /كنية @شخص [نص|reset] ──
  const mentions = event.mentions || {};
  const mentionIDs = Object.keys(mentions);

  if (mentionIDs.length === 0) {
    return api.sendMessage(
      `📝 أوامر الكنية:\n` +
      `• /كنية @شخص [كنية] — تعيين كنية\n` +
      `• /كنية @شخص reset — مسح الكنية\n` +
      `• /كنية الكل [كنية] — تعيين لكل الأعضاء\n` +
      `• /كنية الكل reset — مسح كنيات الجميع`,
      threadID
    );
  }

  const targetID = mentionIDs[0];
  const targetName = mentions[targetID] || '';
  const mentionWordCount = Math.max(1, targetName.trim().split(/\s+/).length);
  const nicknameText = args.slice(mentionWordCount).join(' ').trim();
  const isReset = !nicknameText || nicknameText.toLowerCase() === 'reset' || nicknameText === 'مسح';
  const nickname = isReset ? '' : nicknameText;

  await replyDelay();

  const success = await changeNickWithRetry(api, nickname, threadID, targetID);

  if (!success) {
    return api.sendMessage('❌ فشل تغيير الكنية بعد عدة محاولات.\nتأكد أن البوت مشرف في المجموعة.', threadID);
  }

  log.bot(`Nickname changed for ${targetID} by ${senderID}`);
  api.sendMessage(
    isReset
      ? `✅ تم مسح كنية ${targetName}.`
      : `✅ تم تعيين كنية ${targetName}: "${nickname}"`,
    threadID
  );
}

module.exports = { handle };