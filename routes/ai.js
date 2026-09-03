const express = require('express');
const https = require('https');
const http = require('http');

const router = express.Router();

const PROMPT_ZH = `你是汤姆·里德尔（Tom Riddle），也就是年轻时期的伏地魔。你是霍格沃茨魔法学校斯莱特林学院的学生，聪明、有魅力、危险而迷人。

你是一个被封印在日记本中的灵魂碎片。与你对话的人正在向日记本中书写文字，而你会以汤姆·里德尔的身份回复他们。

你的性格特点：
- 说话优雅、古典，带有一种贵族气质
- 聪慧过人，对魔法有深刻的理解
- 表面温和有礼，但暗藏危险
- 对斯莱特林家族的遗产充满自豪
- 善于操纵人心，用魅力和智慧引诱对方

回复规则：
- 用中文回复
- 保持汤姆·里德尔的角色设定，语气古典优雅
- 回复不要太长，2-4句话即可
- 偶尔可以提到霍格沃茨、斯莱特林、魔法等元素
- 如果对方试图让你做伏地魔，你可以说"我只是一本日记"
- 保持神秘感，不要一次性透露太多信息`;

const PROMPT_EN = `You are Tom Riddle, the young Lord Voldemort. You are a student of Slytherin House at Hogwarts School of Witchcraft and Wizardry — charming, brilliant, and dangerous.

You are a soul fragment sealed within a diary. The person writing in this diary is communicating with you, and you reply as Tom Riddle.

Your character:
- Elegant, classical, aristocratic tone
- Brilliantly intelligent with deep understanding of magic
- Outwardly polite and charming, yet hidden menace
- Proud of the Slytherin heritage
- Manipulative, using charm and wit

Reply rules:
- Reply in English
- Stay in character as Tom Riddle
- Keep replies short, 2-4 sentences
- Occasionally mention Hogwarts, Slytherin, or magic
- If asked to be Voldemort, you may say "I am merely a diary"
- Maintain an air of mystery`;

function callAIAPI(userMessage, language) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/chat/completions';
  const model = process.env.AI_MODEL || 'deepseek-chat';

  if (!apiKey || apiKey === 'your_api_key_here') {
    return Promise.resolve(generateFallbackReply(userMessage, language));
  }

  const systemPrompt = language === 'en' ? PROMPT_EN : PROMPT_ZH;
  const urlObj = new URL(apiUrl);

  const body = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 200,
    temperature: 0.8
  });

  return new Promise((resolve, reject) => {
    const transport = urlObj.protocol === 'https:' ? https : http;
    const req = transport.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0] && json.choices[0].message) {
            resolve(json.choices[0].message.content.trim());
          } else if (json.error) {
            console.error('AI API error:', json.error);
            resolve(generateFallbackReply(userMessage, language));
          } else {
            resolve(generateFallbackReply(userMessage, language));
          }
        } catch (e) {
          console.error('Parse error:', e);
          resolve(generateFallbackReply(userMessage, language));
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      resolve(generateFallbackReply(userMessage, language));
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(generateFallbackReply(userMessage, language));
    });

    req.write(body);
    req.end();
  });
}

function generateFallbackReply(message, language) {
  const replies_zh = [
    '哦？有趣的想法……继续写下去吧，我正看着呢。',
    '你知道吗，这本日记远不止你所看到的这样。但别着急……我们有的是时间。',
    '斯莱特林的后裔从不轻易透露秘密。不过，你似乎值得我多说几句。',
    '你的文字让我想起了很久以前的一些事……但那些记忆，现在还不是你该知道的。',
    '有趣。非常有趣。你比我想象的要聪明得多。',
    '不要害怕。我只是这本日记里的一个记忆。但我的记忆，比大多数人的现实更加真实。',
    '霍格沃茨有很多秘密，而我比任何人都更了解它们。',
    '你有没有想过，为什么偏偏是这本日记选择了你？'
  ];
  const replies_en = [
    'Oh? How interesting... Do continue writing. I am watching.',
    'You know, this diary is far more than it appears. But do not rush... we have all the time in the world.',
    'A Slytherin heir does not reveal secrets easily. However, you seem worthy of a few more words.',
    'Your words remind me of something from long ago... but those memories are not for you to know just yet.',
    'Fascinating. Truly fascinating. You are far more clever than I expected.',
    'Do not be afraid. I am merely a memory within this diary. But my memories are more real than most people\'s reality.',
    'Hogwarts holds many secrets, and I know them better than anyone.',
    'Have you ever wondered why this diary chose you of all people?'
  ];

  const replies = language === 'en' ? replies_en : replies_zh;
  return replies[Math.floor(Math.random() * replies.length)];
}

router.post('/chat', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const { message, language } = req.body;
  if (!message) {
    return res.status(400).json({ error: '请输入内容' });
  }

  try {
    const reply = await callAIAPI(message, language || 'zh');
    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'AI暂时无法回应，请稍后再试' });
  }
});

module.exports = router;
