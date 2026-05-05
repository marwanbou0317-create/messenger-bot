const ytsr = require('ytsr');

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
    const results = await ytsr(query, { limit: 10 });
    const videos = results.items
      .filter((item) => item.type === 'video')
      .slice(0, 5);

    if (videos.length === 0) {
      return api.sendMessage(`❌ لم أجد نتائج لـ "${query}".`, threadID);
    }

    let msg = `🎵 نتائج يوتيوب لـ "${query}":\n${'─'.repeat(28)}\n\n`;
    videos.forEach((v, i) => {
      msg += `${i + 1}. ${v.title}\n`;
      msg += `   ⏱ ${v.duration || '--'}  •  📺 ${v.author?.name || ''}\n`;
      msg += `   🔗 ${v.url}\n\n`;
    });

    api.sendMessage(msg.trim(), threadID);
  } catch (e) {
    api.sendMessage(
      `❌ فشل البحث في يوتيوب: ${e.message}\n🔗 https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      threadID
    );
  }
}

module.exports = { handle };
