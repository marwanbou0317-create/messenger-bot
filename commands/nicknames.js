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
            log.error(`nicknames [${attempt}/${maxRetries}] فشل للمستخدم ${uid}: ${JSON.stringify(err)}`);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (e) {
        log.error(`nicknames [${attempt}/${maxRetries}] استثناء للمستخدم ${uid}: ${e.message}`);
        resolve(false);
      }
    });

    if (success) return true;

    if (attempt < maxRetries) {
      const waitMs = attempt * 4000 + Math.floor(Math.random() * 3000);
      log.bot(`nicknames: انتظار ${waitMs}ms قبل إعادة المحاولة للمستخدم ${uid}`);
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

  const input = args.join(' ').trim();

  if (!input) {
    return api.sendMessage(
      `📝 أمر الكنيات الشامل:\n` +
      `• /كنيات [نص] — تعيين نفس الكنية لكل أعضاء القروب\n` +
      `• /كنيات reset — مسح كنيات جميع الأعضاء\n\n` +
      `مثال: /كنيات 🌟 نجم`,
      threadID
    );
  }

  const isReset = input.toLowerCase() === 'reset' || input === 'مسح';
  const nickname = isReset ? '' : input;

  await replyDelay();

  api.getThreadInfo(threadID, async (err, info) => {
    if (err || !info) {
      log.error('nicknames: فشل getThreadInfo: ' + JSON.stringify(err));
      return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);
    }

    const participants = info.participantIDs || [];
    if (participants.length === 0) {
      return api.sendMessage('⚠️ لا يوجد أعضاء في المجموعة.', threadID);
    }

    api.sendMessage(
      `⏳ جاري ${isReset ? 'مسح' : `تعيين كنية "${nickname}"`} لـ ${participants.length} عضو...\n(دفعات بتأخير لتجنب الحظر)`,
      threadID
    );

    let done = 0;
    let failed = 0;
    const BATCH = 5;

    for (let i = 0; i < participants.length; i++) {
      // توقف أطول بين كل دفعة من 5 أعضاء
      if (i > 0 && i % BATCH === 0) {
        const pause = 12000 + Math.floor(Math.random() * 8000);
        log.bot(`nicknames: توقف دفعة ${pause}ms بعد ${i} عضو`);
        await sleep(pause);
      } else if (i > 0) {
        await randomDelay(4000, 8000);
      }

      const uid = participants[i];
      const success = await changeNickWithRetry(api, nickname, threadID, uid);
      if (success) {
        done++;
        // تحديث التقدم كل 10 أعضاء
        if (done % 10 === 0) {
          api.sendMessage(`⏳ تم ${done} من ${participants.length}...`, threadID);
        }
      } else {
        failed++;
      }
    }

    api.sendMessage(
      isReset
        ? `✅ اكتمل!\nتم مسح كنيات: ${done} عضو${failed ? `\n⚠️ فشل: ${failed} عضو` : ''}`
        : `✅ اكتمل!\nتم تعيين كنية "${nickname}" لـ ${done} عضو${failed ? `\n⚠️ فشل: ${failed} عضو` : ''}`,
      threadID
    );
  });
}

module.exports = { handle };