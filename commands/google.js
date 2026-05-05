const axios = require('axios');

async function handle(event, api, args) {
  const threadID = event.threadID;
  const query = args.join(' ').trim();

  if (!query) {
    return api.sendMessage(
      '🔍 اكتب ما تبحث عنه بعد الأمر.\nمثال: /غوغل طبيعة خضراء',
      threadID
    );
  }

  api.sendMessage('⏳ جاري البحث عن صور في غوغل...', threadID);

  try {
    const res = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&hl=ar&safe=off`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en;q=0.9',
          'Referer': 'https://www.google.com/',
        },
        timeout: 12000,
      }
    );

    const html = res.data;

    // استخراج روابط الصور من بيانات غوغل المضمنة
    const matches = [...html.matchAll(/\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif))",\d+,\d+\]/gi)];
    const images = [...new Set(
      matches
        .map(m => m[1])
        .filter(url => !url.includes('gstatic') && !url.includes('google.com'))
    )].slice(0, 5);

    if (images.length === 0) {
      return api.sendMessage(
        `❌ لم أجد صور لـ "${query}" من غوغل.\n🔗 ابحث يدوياً: https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
        threadID
      );
    }

    let msg = `🖼 صور غوغل لـ "${query}":\n${'─'.repeat(30)}\n\n`;
    images.forEach((url, i) => {
      msg += `${i + 1}. ${url}\n\n`;
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage('❌ حدث خطأ أثناء البحث في غوغل:\n' + e.message, threadID);
  }
}

module.exports = { handle };
