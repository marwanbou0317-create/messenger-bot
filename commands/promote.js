const { isSuperAdmin, isAdmin, addAdmin, getRole } = require('../utils/admin');
const log = require('../utils/logger');

function handle(event, api, args) {
  const senderID = event.senderID;
  const threadID = event.threadID;

  if (!isSuperAdmin(senderID)) {
    return api.sendMessage('❌ فقط سوبر أدمن يمكنه رفع الأشخاص.', threadID);
  }

  const mentions = event.mentions;
  let targetID = null;
  let targetName = null;

  if (mentions && Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
    targetName = mentions[targetID];
  } else if (args[0] && /^\d+$/.test(args[0])) {
    targetID = args[0];
    targetName = 'ID: ' + args[0];
  }

  if (!targetID) {
    return api.sendMessage(
      '❗ يجب تحديد شخص.\nمثال: /رفع @اسم\nأو: /رفع [ID]',
      threadID
    );
  }

  if (isSuperAdmin(targetID)) {
    return api.sendMessage('⚠️ هذا الشخص هو سوبر أدمن ولا يمكن تغيير رتبته.', threadID);
  }

  if (isAdmin(targetID)) {
    return api.sendMessage(`⚠️ ${targetName || targetID} هو مشرف بالفعل.`, threadID);
  }

  addAdmin(targetID);
  log.bot(`${targetID} promoted to admin by ${senderID}`);

  return api.sendMessage(
    `✅ تم رفع ${targetName || targetID} إلى مشرف البوت.`,
    threadID
  );
}

module.exports = { handle };
