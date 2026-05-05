const { isAdmin } = require('../utils/admin');
const { longDelay, replyDelay } = require('../utils/delay');
const log = require('../utils/logger');

async function changeNick(api, nickname, threadID, uid) {
  return new Promise((resolve) => {
    try {
      api.changeNickname(nickname, threadID, uid, (err) => {
        if (err) {
          log.error(`nicknames: فشل للمستخدم ${uid}: ${JSON.stringify(err)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (e) {
      log.error(`nicknames: استثناء للمستخدم ${uid}: ${e.message}`);
      resolve(false);
    }
  });
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
      `⏳ جاري ${isReset ? 'مسح' : `تعيين كنية "${nickname}"`} لـ ${participants.length} عضو...\n(سيستغرق بعض الوقت لتجنب الحظر)`,
      threadID
    );

    let done = 0;
    let failed = 0;

    for (const uid of participants) {
      await longDelay();
      const success = await changeNick(api, nickname, threadID, uid);
      if (success) {
        done++;
      } else {
        failed++;
      }
    }

    api.sendMessage(
      isReset
        ? `✅ تم مسح كنيات ${done} عضو.${failed ? `\n⚠️ فشل: ${failed} عضو` : ''}`
        : `✅ تم تعيين كنية "${nickname}" لـ ${done} عضو.${failed ? `\n⚠️ فشل: ${failed} عضو` : ''}`,
      threadID
    );
  });
}

module.exports = { handle };
