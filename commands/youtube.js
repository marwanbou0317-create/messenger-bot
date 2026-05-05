const axios = require('axios');

const YOUTUBE_API = 'https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

const CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '17.31.35',
    androidSdkVersion: 30,
    hl: 'ar',
    gl: 'SA',
  },
};

async function handle(event, api, args) {
  const threadID = event.threadID;
  const query = args.join(' ').trim();

  if (!query) {
    return api.sendMessage(
      '🎵 اكتب اسم الأغنية بعد الأمر.\nمثال: /يوتيوب ماكولي',
      threadID
    );
  }

  api.sendMessage('⏳ جاري البحث في يوتيوب...', threadID);

  try {
    const res = await axios.post(
      YOUTUBE_API,
      { query, context: CONTEXT },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip',
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '17.31.35',
        },
        timeout: 12000,
      }
    );

    const contents =
      res.data?.contents?.sectionListRenderer?.contents?.[0]
        ?.itemSectionRenderer?.contents ||
      res.data?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents?.[0]
        ?.itemSectionRenderer?.contents || [];

    const videos = [];
    for (const item of contents) {
      if (item.videoRenderer && videos.length < 5) {
        const v = item.videoRenderer;
        const title = v.title?.runs?.[0]?.text || 'بدون عنوان';
        const id = v.videoId;
        const duration = v.lengthText?.simpleText || '--';
        const channel = v.ownerText?.runs?.[0]?.text || '';
        if (id) videos.push({ title, id, duration, channel });
      }
    }

    if (videos.length === 0) {
      return api.sendMessage(
        `❌ لم أجد نتائج لـ "${query}" في يوتيوب.\n🔗 ابحث يدوياً: https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        threadID
      );
    }

    let msg = `🎵 نتائج يوتيوب لـ "${query}":\n${'─'.repeat(28)}\n\n`;
    videos.forEach((v, i) => {
      msg += `${i + 1}. ${v.title}\n`;
      msg += `   ⏱ ${v.duration}  •  📺 ${v.channel}\n`;
      msg += `   🔗 https://youtu.be/${v.id}\n\n`;
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage(
      `❌ فشل البحث في يوتيوب.\n🔗 ابحث يدوياً: https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      threadID
    );
  }
}

module.exports = { handle };
