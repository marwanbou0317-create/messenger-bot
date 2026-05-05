/**
 * أداة التأخير - تمنع فيسبوك من اكتشاف نشاط البوت
 */

// تأخير عشوائي بين حدين
function randomDelay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// تأخير قصير (بين الرسائل العادية) 1-3 ثانية
function shortDelay() {
  return randomDelay(1000, 3000);
}

// تأخير متوسط (بين العمليات المتعددة) 2-5 ثواني
function mediumDelay() {
  return randomDelay(2000, 5000);
}

// تأخير طويل (بين تغيير الكنى الجماعي) 3-7 ثواني
function longDelay() {
  return randomDelay(3000, 7000);
}

// تأخير قبل الرد على الأوامر (يبدو أكثر طبيعية) 0.5-1.5 ثانية
function replyDelay() {
  return randomDelay(500, 1500);
}

// تأخير عشوائي لوقت المحرك (+-20% من الوقت المحدد)
function engineDelay(baseSeconds) {
  const base = baseSeconds * 1000;
  const jitter = base * 0.2;
  return randomDelay(base - jitter, base + jitter);
}

module.exports = { randomDelay, shortDelay, mediumDelay, longDelay, replyDelay, engineDelay };
