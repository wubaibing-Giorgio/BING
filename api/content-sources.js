module.exports = function handler(req, res) {
  res.status(200).json({
    sources: [
      { type: '英文故事', title: 'Storynory', description: '儿童音频故事、童话、神话、教育故事和诗歌音乐。', url: 'https://www.storynory.com/' },
      { type: '多语言有声书', title: 'LibriVox', description: '公共领域免费有声书，可按语言和主题选择内容。', url: 'https://librivox.org/' },
      { type: '胎教音乐', title: 'Musopen', description: '免版权古典音乐，可按作曲家、乐器、情绪筛选。', url: 'https://musopen.org/music/' }
    ]
  });
};
