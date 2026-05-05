const { isAdmin } = require('../utils/admin');
const { longDelay, replyDelay } = require('../utils/delay');
const log = require('../utils/logger');

function changeNick(api, nickname, threadID, uid) {
  return new Promise((resolve) => {
    try {
      api.changeNickname(nickname, threadID, uid, (err) => {
        if (err) {
          log.error(`nickname: فشل للمستخدم ${uid}: ${JSON.stringify(err)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (e) {
      log.error(`nickname: استثناء للمستخدم ${uid}: ${e.message}`);
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

  const subCmd = (args[0] || '').trim();

  // ── /كنية الكل [نص|reset] ──
  if (subCmd === 'الكل' || subCmd === 'all') {
    const nicknameText = args.slice(1).join(' ').trim();
    const isReset = !nicknameText || nicknameText.toLowerCase() === 'reset' || nicknameText === 'مسح';
    const nickname = isReset ? '' : nicknameText;

    await replyDelay();

    api.getThreadInfo(threadID, async (err, info) => {
      if (err || !info) {
        log.error('nickname: فشل getThreadInfo: ' + JSON.stringify(err));
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

  const success = await changeNick(api, nickname, threadID, targetID);

  if (!success) {
    return api.sendMessage('❌ فشل تغيير الكنية. تأكد من أن البوت مشرف في المجموعة.', threadID);
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
