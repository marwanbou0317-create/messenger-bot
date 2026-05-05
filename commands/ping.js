const { getRole } = require('../utils/admin');

function handle(event, api) {
  const threadID = event.threadID;
  const senderID = event.senderID;
  const role = getRole(senderID);
  const roleText = role === 'superadmin' ? '👑 سوبر أدمن' : role === 'admin' ? '🔧 مشرف' : '👤 عضو';
  const now = new Date().toLocaleTimeString('ar-SA', { hour12: false });
  api.sendMessage(`🏓 البوت يعمل!\n⏰ الوقت: ${now}\n🪪 رتبتك: ${roleText}`, threadID);
}

module.exports = { handle };
