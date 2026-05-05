const os = require('os');

let startTime = Date.now();

function setStartTime(t) {
  startTime = t;
}

function getUptime() {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}س ${m}د ${s}ث`;
}

function handleServer(event, api) {
  const threadID = event.threadID;
  const mem = process.memoryUsage();
  const freeRam = (os.freemem() / 1024 / 1024).toFixed(1);
  const totalRam = (os.totalmem() / 1024 / 1024).toFixed(1);
  const usedMB = (mem.rss / 1024 / 1024).toFixed(1);
  const platform = os.platform();
  const nodeVer = process.version;
  const uptime = getUptime();

  api.sendMessage(
    `🖥 معلومات السيرفر:\n` +
    `▪️ المنصة: ${platform}\n` +
    `▪️ Node.js: ${nodeVer}\n` +
    `▪️ ذاكرة البوت: ${usedMB} MB\n` +
    `▪️ ذاكرة السيرفر: ${freeRam}/${totalRam} MB\n` +
    `▪️ وقت التشغيل: ${uptime}`,
    threadID
  );
}

function handleUptime(event, api) {
  const threadID = event.threadID;
  api.sendMessage(`⏱ وقت تشغيل البوت: ${getUptime()}`, threadID);
}

module.exports = { handleServer, handleUptime, setStartTime };
