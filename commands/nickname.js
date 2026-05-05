const { isAdmin } = require('../utils/admin');
const log = require('../utils/logger');

function handle(event, api, args) {
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

    api.getThreadInfo(threadID, (err, info) => {
      if (err || !info) {
        return api.sendMessage('❌ تعذّر جلب معلومات المجموعة.', threadID);
      }

      const participants = info.participantIDs || [];
      if (participants.length === 0) {
        return api.sendMessage('⚠️ لا يوجد أعضاء في المجموعة.', threadID);
      }

      let done = 0;
      let failed = 0;
      const total = participants.length;

      const finish = () => {
        if (done + failed === total) {
          api.sendMessage(
            isReset
              ? `✅ تم مسح كنيات ${done} عضو.${failed ? ` (فشل: ${failed})` : ''}`
              : `✅ تم تعيين كنية "${nickname}" لـ ${done} عضو.${failed ? ` (فشل: ${failed})` : ''}`,
            threadID
          );
        }
      };

      for (const uid of participants) {
        api.changeNickname(
          isReset ? '' : nickname,
          threadID,
          uid,
          (err2) => {
            if (err2) { failed++; } else { done++; }
            finish();
          }
        );
      }
    });

    return;
  }

  // لا يوجد منشن — إظهار المساعدة
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

  // حساب عدد كلمات الاسم لتجاوزها بشكل صحيح في args
  // مثال: "@أحمد محمد جديد" => mentionWordCount=2 => nicknameText="جديد"
  const mentionWordCount = Math.max(1, targetName.trim().split(/\s+/).length);
  const nicknameText = args.slice(mentionWordCount).join(' ');
  const isReset = !nicknameText || nicknameText.toLowerCase() === 'reset' || nicknameText === 'مسح';

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
