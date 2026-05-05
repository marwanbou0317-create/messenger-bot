const axios = require('axios');

async function handle(event, api, args) {
  const threadID = event.threadID;
  const query = args.join(' ').trim();

  if (!query) {
    return api.sendMessage(
      '🔍 اكتب ما تبحث عنه بعد الأمر.\nمثال: /بنترست أزياء عربية',
      threadID
    );
  }

  api.sendMessage('⏳ جاري البحث في بنترست...', threadID);

  try {
    const res = await axios.get(
      `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en;q=0.9',
        },
        timeout: 12000,
      }
    );

    const html = res.data;

    // استخراج روابط الصور من HTML
    const imageMatches = [...html.matchAll(/"orig"\s*:\s*\{"url"\s*:\s*"(https:\/\/i\.pinimg\.com[^"]+)"/g)];
    const images = [...new Set(imageMatches.map(m => m[1]))].slice(0, 5);

    // استخراج روابط الـ pins
    const pinMatches = [...html.matchAll(/href="(\/pin\/\d+\/)"/g)];
    const pins = [...new Set(pinMatches.map(m => `https://www.pinterest.com${m[1]}`))].slice(0, 5);

    if (images.length === 0 && pins.length === 0) {
      return api.sendMessage(`❌ لم أجد نتائج لـ: "${query}" في بنترست.`, threadID);
    }

    let msg = `📌 نتائج بنترست لـ "${query}":\n${'─'.repeat(30)}\n\n`;

    const count = Math.max(images.length, pins.length);
    for (let i = 0; i < Math.min(count, 5); i++) {
      msg += `${i + 1}.`;
      if (images[i]) msg += `\n   🖼 ${images[i]}`;
      if (pins[i]) msg += `\n   🔗 ${pins[i]}`;
      msg += '\n\n';
    }

    if (images.length === 0) {
      msg += `🔗 رابط البحث: https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    }

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage('❌ حدث خطأ أثناء البحث في بنترست:\n' + e.message, threadID);
  }
}

module.exports = { handle };
