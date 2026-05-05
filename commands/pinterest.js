const axios = require('axios');

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
    const timestamp = Date.now();
    const res = await axios.get(
      `https://www.pinterest.com/resource/BaseSearchResource/get/`,
      {
        params: {
          source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
          data: JSON.stringify({
            options: {
              query,
              scope: 'pins',
              page_size: 8,
              no_fetch_context_on_resource: false,
            },
            context: {},
          }),
          _: timestamp,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*, q=0.01',
          'Accept-Language': 'ar,en;q=0.9',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        },
        timeout: 12000,
      }
    );

    const results = res.data?.resource_response?.data?.results || [];
    const images = [];

    for (const pin of results) {
      const img =
        pin.images?.orig?.url ||
        pin.images?.['736x']?.url ||
        pin.images?.['474x']?.url;
      const link = pin.id ? `https://www.pinterest.com/pin/${pin.id}/` : null;
      if (img && images.length < 5) {
        images.push({ img, link });
      }
    }

    if (images.length === 0) {
      return api.sendMessage(
        `❌ لم أجد نتائج لـ "${query}" في بنترست.\n🔗 ابحث يدوياً: https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        threadID
      );
    }

    let msg = `📌 نتائج بنترست لـ "${query}":\n${'─'.repeat(28)}\n\n`;
    images.forEach((item, i) => {
      msg += `${i + 1}. 🖼 ${item.img}\n`;
      if (item.link) msg += `   🔗 ${item.link}\n`;
      msg += '\n';
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage(
      `❌ فشل البحث في بنترست.\n🔗 ابحث يدوياً: https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      threadID
    );
  }
}

module.exports = { handle };
