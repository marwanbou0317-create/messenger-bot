const axios = require('axios');

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
    const r1 = await axios.get('https://duckduckgo.com/', {
      params: { q: query, iax: 'images', ia: 'images' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0',
        'Accept-Language': 'ar,en;q=0.9',
      },
      timeout: 10000,
    });

    const m = r1.data.match(/vqd=['"]?([\d-]+)['"]?/);
    if (!m) throw new Error('فشل استخراج رمز البحث');

    const r2 = await axios.get('https://duckduckgo.com/i.js', {
      params: { q: query, vqd: m[1], o: 'json', p: '1', s: '0', u: 'bing', f: ',,,,,' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://duckduckgo.com/',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const images = (r2.data?.results || []).slice(0, 5);

    if (images.length === 0) {
      return api.sendMessage(`❌ لم أجد صور لـ "${query}".`, threadID);
    }

    let msg = `🖼 صور لـ "${query}":\n${'─'.repeat(28)}\n\n`;
    images.forEach((item, i) => {
      msg += `${i + 1}. ${item.image}\n\n`;
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage(
      `❌ فشل البحث عن صور.\n🔗 https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      threadID
    );
  }
}

module.exports = { handle };
