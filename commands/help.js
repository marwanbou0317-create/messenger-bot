const { getRole } = require('../utils/admin');

function handle(event, api, args, prefix) {
  const senderID = event.senderID;
  const threadID = event.threadID;
  const role = getRole(senderID);

  const baseCommands =
    `📋 قائمة الأوامر:\n\n` +
    `${prefix}اوامر — عرض هذه القائمة\n` +
    `${prefix}سيرفر — معلومات البوت والسيرفر\n` +
    `${prefix}ابتيم — وقت تشغيل البوت`;

  const adminCommands =
    `\n\n🔧 أوامر الإدارة:\n` +
    `${prefix}محرك — تشغيل/إيقاف المحرك\n` +
    `${prefix}محرك رسالة [نص]\n` +
    `${prefix}محرك وقت [ثواني]\n` +
    `${prefix}محرك الذكي\n` +
    `${prefix}محرك حالة\n\n` +
    `${prefix}قفل — قفل/فتح هذه المجموعة\n` +
    `${prefix}قفل الذكي — قفل كل المجموعات\n` +
    `${prefix}قفل عادي — قفل هذه المجموعة\n` +
    `${prefix}قفل حالة`;

  const superAdminCommands =
    `\n\n👑 أوامر سوبر أدمن:\n` +
    `${prefix}رفع [@شخص أو ID] — رفع لمشرف\n` +
    `${prefix}اخفاض [@شخص أو ID] — إنزال من مشرف`;

  let msg = baseCommands;
  if (role === 'admin' || role === 'superadmin') msg += adminCommands;
  if (role === 'superadmin') msg += superAdminCommands;

  const roleText = role === 'superadmin' ? '👑 سوبر أدمن' : role === 'admin' ? '🔧 مشرف' : '👤 عضو';
  msg += `\n\n🪪 رتبتك: ${roleText}`;

  return api.sendMessage(msg, threadID);
}

module.exports = { handle };
