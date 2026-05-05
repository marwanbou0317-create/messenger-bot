const { isAdmin } = require('../utils/admin');
const { longDelay, replyDelay } = require('../utils/delay');
const log = require('../utils/logger');

async function handle(event, api, args) {
  const senderID = event.senderID;
  const threadID = event.threadID;

  if (!isAdmin(senderID)) {
    return api.sendMessage('❌ ليس لديك صلاحية استخدام هذا الأمر.', threadID);
  }

  const mentions = event.mentions || {};
  const mentionIDs = Object.keys(mentions);
  const subCmd = args[0] || '';

  // /كنية الكل [نص|reset]
  if (subCmd === 'الكل' || subCmd === 'all') {
    const nickname = args.slice(1).join(' ');
    const isReset = !nickname || nickname.toLowerCase() === 'reset' || nickname === 'مسح';

    api.getThreadInfo(threadID, async (err, info) => {
      if (err || !info) {
        return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);
      }

      const participants = info.participantIDs || [];
      if (participants.length === 0) {
        return api.sendMessage('⚠️ لا يوجد أعضاء في المجموعة.', threadID);
      }

      api.sendMessage(
        `⏳ جاري ${isReset ? 'مسح' : 'تعيين'} الكنيات لـ ${participants.length} عضو...\n(سيستغرق هذا بعض الوقت لتجنب الحظر)`,
        threadID
      );

      let done = 0;
      let failed = 0;

      for (const uid of participants) {
        // تأخير طويل بين كل تغيير كنية لتجنب الاكتشاف
        await longDelay();

        await new Promise(resolve => {
          api.changeNickname(
            isReset ? '' : nickname,
            threadID,
            uid,
            (err2) => {
              if (err2) { failed++; } else { done++; }
              resolve();
            }
          );
        });
      }

      api.sendMessage(
        isReset
          ? `✅ تم مسح كنيات ${done} عضو.${failed ? ` (فشل: ${failed})` : ''}`
          : `✅ تم تعيين كنية "${nickname}" لـ ${done} عضو.${failed ? ` (فشل: ${failed})` : ''}`,
        threadID
      );
    });

    return;
  }

  // لا يوجد منشن
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

  // حساب عدد كلمات الاسم لتجاوزها بشكل صحيح
  const mentionWordCount = Math.max(1, targetName.trim().split(/\s+/).length);
  const nicknameText = args.slice(mentionWordCount).join(' ');
  const isReset = !nicknameText || nicknameText.toLowerCase() === 'reset' || nicknameText === 'مسح';

  // تأخير قصير قبل الرد
  await replyDelay();

  api.changeNickname(
    isReset ? '' : nicknameText,
    threadID,
    targetID,
    (err) => {
      if (err) {
        log.error('changeNickname error: ' + err);
        return api.sendMessage('❌ فشل تغيير الكنية. تأكد من أن البوت مشرف في المجموعة.', threadID);
      }
      log.bot(`Nickname changed for ${targetID} by ${senderID}`);
      api.sendMessage(
        isReset
          ? `✅ تم مسح كنية ${targetName}.`
          : `✅ تم تعيين كنية ${targetName}: "${nicknameText}"`,
        threadID
      );
    }
  );
}

module.exports = { handle };
