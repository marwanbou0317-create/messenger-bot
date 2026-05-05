const axios = require('axios');

async function handle(event, api, args) {
  const threadID = event.threadID;
  const query = args.join(' ').trim();

  if (!query) {
    return api.sendMessage(
      '🔍 اكتب اسم الأغنية بعد الأمر.\nمثال: /يوتيوب ماكولي',
      threadID
    );
  }

  api.sendMessage('⏳ جاري البحث في يوتيوب...', threadID);

  try {
    const res = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ar,en;q=0.9',
        },
        timeout: 10000,
      }
    );

    const html = res.data;
    const match = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
    if (!match) throw new Error('لم يتم العثور على بيانات اليوتيوب');

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer
        ?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const videos = [];
    for (const item of contents) {
      if (item.videoRenderer && videos.length < 5) {
        const v = item.videoRenderer;
        videos.push({
          title: v.title?.runs?.[0]?.text || 'بدون عنوان',
          id: v.videoId,
          duration: v.lengthText?.simpleText || '--',
          channel: v.ownerText?.runs?.[0]?.text || '',
        });
      }
    }

    if (videos.length === 0) {
      return api.sendMessage(`❌ لم أجد نتائج لـ: "${query}"`, threadID);
    }

    let msg = `🎵 نتائج يوتيوب لـ "${query}":\n${'─'.repeat(30)}\n\n`;
    videos.forEach((v, i) => {
      msg += `${i + 1}. ${v.title}\n`;
      msg += `   ⏱ ${v.duration}  |  📺 ${v.channel}\n`;
      msg += `   🔗 https://youtu.be/${v.id}\n\n`;
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage('❌ حدث خطأ أثناء البحث في يوتيوب:\n' + e.message, threadID);
  }
}

module.exports = { handle };
