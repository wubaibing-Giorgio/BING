# PapaVoice 爸爸的声音胎教

一个手机优先的胎教网页版 App。打开 GitHub Pages 根目录即可使用：

https://wubaibing-giorgio.github.io/BING/

## 当前版本支持

- 四国语言固定为：中文 / English / Italiano / Français
- 录入爸爸声音样本，并保存在当前手机浏览器本地
- 中文播放爸爸原始录音
- English / Italiano / Français 使用浏览器 SpeechSynthesis 系统语音朗读胎教文案
- 保存宝宝昵称、孕周、爸爸称呼、每日提醒时间、爸爸留言
- 记录播放次数、最近播放时间、记录天数
- PWA 支持，可用 iPhone Safari 添加到主屏幕

## 重要说明

GitHub Pages 是纯静态网页，不能真正完成 AI 声纹克隆，也不能把爸爸声音直接转换成英文、意大利语、法语的爸爸音色。

当前是本地演示版：

- 可以录入爸爸声音
- 可以本地保存和播放
- 可以朗读四国语言胎教文案
- 已预留真实后端接口函数：
  - `createVoiceProfile(recordingBlob)`
  - `generateVoiceAudio(language, text, voiceProfileId)`

商业版需要增加：

1. 后端服务器
2. 语音克隆 / 声纹建模服务
3. 翻译或多语言文案生成服务
4. 音频生成与存储
5. 用户授权、隐私协议和数据删除机制

## iPhone 使用方法

1. 用 Safari 打开 `https://wubaibing-giorgio.github.io/BING/`
2. 点击分享按钮
3. 选择“添加到主屏幕”
4. 名称填写 `PapaVoice`
5. 从桌面图标打开

## 麦克风权限

如果不能录音：

1. 打开 iPhone 设置
2. 找到 Safari
3. 找到麦克风
4. 改为允许
5. 回到 PapaVoice 页面重新打开
