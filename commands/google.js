const axios = require('axios');

async function getVqd(query) {
  const res = await axios.get('https://duckduckgo.com/', {
    params: { q: query, iax: 'images', ia: 'images' },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ar,en;q=0.9',
    },
    timeout: 10000,
  });
  const match = res.data.match(/vqd=["']?([\d-]+)["']?/);
  return match ? match[1] : null;
}

async function handle(event, api, args) {
  const threadID = event.threadID;
  const query = args.join(' ').trim();

  if (!query) {
    return api.sendMessage(
      '🖼 اكتب ما تبحث عنه بعد الأمر.\nمثال: /صور طبيعة خضراء',
      threadID
    );
  }

  api.sendMessage('⏳ جاري البحث عن صور...', threadID);

  try {
    const vqd = await getVqd(query);
    if (!vqd) throw new Error('فشل الحصول على رمز البحث');

    const res = await axios.get('https://duckduckgo.com/i.js', {
      params: {
        q: query,
        vqd,
        o: 'json',
        p: '1',
        s: '0',
        u: 'bing',
        f: ',,,,,',
        l: 'ar-ar',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://duckduckgo.com/',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const items = res.data?.results || [];
    const images = items
      .filter((item) => item.image)
      .slice(0, 5)
      .map((item) => ({ img: item.image, source: item.url }));

    if (images.length === 0) {
      return api.sendMessage(
        `❌ لم أجد صور لـ "${query}".`,
        threadID
      );
    }

    let msg = `🖼 صور لـ "${query}":\n${'─'.repeat(28)}\n\n`;
    images.forEach((item, i) => {
      msg += `${i + 1}. ${item.img}\n\n`;
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage(
      `❌ فشل البحث عن صور.\n🔗 ابحث يدوياً: https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      threadID
    );
  }
}

module.exports = { handle };
