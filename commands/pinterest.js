const axios = require('axios');

async function searchImages(query, siteFilter) {
  const fullQ = siteFilter ? `${query} site:${siteFilter}` : query;
  const r1 = await axios.get('https://duckduckgo.com/', {
    params: { q: fullQ, iax: 'images', ia: 'images' },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0',
      'Accept-Language': 'ar,en;q=0.9',
    },
    timeout: 10000,
  });

  const m = r1.data.match(/vqd=['"]?([\d-]+)['"]?/);
  if (!m) throw new Error('فشل استخراج رمز البحث');

  const r2 = await axios.get('https://duckduckgo.com/i.js', {
    params: { q: fullQ, vqd: m[1], o: 'json', p: '1', s: '0', u: 'bing', f: ',,,,,' },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://duckduckgo.com/',
      'Accept': 'application/json',
    },
    timeout: 10000,
  });

  return r2.data?.results || [];
}

async function handle(event, api, args) {
  const threadID = event.threadID;
  const query = args.join(' ').trim();

  if (!query) {
    return api.sendMessage(
      '📌 اكتب ما تبحث عنه بعد الأمر.\nمثال: /بنترست أزياء عربية',
      threadID
    );
  }

  api.sendMessage('⏳ جاري البحث في بنترست...', threadID);

  try {
    const results = await searchImages(query, 'pinterest.com');
    const pins = results
      .filter((i) => i.image && i.image.includes('pinimg'))
      .slice(0, 5);

    if (pins.length === 0) {
      return api.sendMessage(
        `❌ لم أجد نتائج لـ "${query}" في بنترست.\n🔗 https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        threadID
      );
    }

    let msg = `📌 نتائج بنترست لـ "${query}":\n${'─'.repeat(28)}\n\n`;
    pins.forEach((item, i) => {
      msg += `${i + 1}. 🖼 ${item.image}\n`;
      if (item.url) msg += `   🔗 ${item.url}\n`;
      msg += '\n';
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage(
      `❌ فشل البحث في بنترست.\n🔗 https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      threadID
    );
  }
}

module.exports = { handle };
