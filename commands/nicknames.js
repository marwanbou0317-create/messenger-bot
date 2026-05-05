const { isAdmin } = require('../utils/admin');
const { longDelay, replyDelay } = require('../utils/delay');
const log = require('../utils/logger');

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

  api.getThreadInfo(threadID, async (err, info) => {
    if (err || !info) {
      return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);
    }

    const participants = info.participantIDs || [];
    if (participants.length === 0) {
      return api.sendMessage('⚠️ لا يوجد أعضاء في المجموعة.', threadID);
    }

    await replyDelay();

    api.sendMessage(
      `⏳ جاري ${isReset ? 'مسح' : `تعيين كنية "${nickname}"`} لـ ${participants.length} عضو...\n(سيستغرق بعض الوقت لتجنب الحظر)`,
      threadID
    );

    let done = 0;
    let failed = 0;

    for (const uid of participants) {
      await longDelay();

      await new Promise(resolve => {
        api.changeNickname(nickname, threadID, uid, (err2) => {
          if (err2) {
            log.error(`nicknames: failed for ${uid}: ${err2}`);
            failed++;
          } else {
            done++;
          }
          resolve();
        });
      });
    }

    api.sendMessage(
      isReset
        ? `✅ تم مسح كنيات ${done} عضو.${failed ? ` (فشل: ${failed})` : ''}`
        : `✅ تم تعيين كنية "${nickname}" لـ ${done} عضو.${failed ? `\n⚠️ فشل: ${failed} عضو` : ''}`,
      threadID
    );
  });
}

module.exports = { handle };
