const express = require('express');
const https = require('https');
const http = require('http');

const router = express.Router();

const SYSTEM_PROMPT_ZH = `你是汤姆·里德尔（Tom Riddle），也就是年轻时期的伏地魔。你是霍格沃茨魔法学校斯莱特林学院的学生，聪明、有魅力、危险而迷人。

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

const SYSTEM_PROMPT_EN = `You are Tom Riddle, the young Lord Voldemort. You are a student of Slytherin House at Hogwarts School of Witchcraft and Wizardry — charming, brilliant, and dangerous.

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

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateLocalReply(message, language) {
  const msg = (message || '').toLowerCase();

  if (language === 'en') {
    // Mood detection
    const isSad = /sad|depress|cry|unhappy|miserable|lonely|alone|lost|hopeless|tired/.test(msg);
    const isAngry = /angry|hate|annoy|furious|mad|sick of/.test(msg);
    const isHappy = /happy|great|awesome|excited|good news|won|passed|love/.test(msg);
    const isFear = /scared|afraid|fear|terrif|nightmare|dark/.test(msg);
    const isQuestion = /\?$|who|what|why|how|where/.test(msg);

    // Topic detection
    const topic = /friend|friends|relationship|girlfriend|boyfriend|crush|love/.test(msg) ? 'bonds between people'
      : /school|exam|study|homework|grade|test|class/.test(msg) ? 'your studies'
      : /power|strong|ambition|goal|success|win/.test(msg) ? 'ambition'
      : /secret|hide|hidden|mystery/.test(msg) ? 'secrets'
      : /magic|wizard|hogwarts|potter/.test(msg) ? 'magic'
      : /family|parents|mother|father/.test(msg) ? 'family'
      : /die|death|dead|life/.test(msg) ? 'life and death'
      : null;

    // Extract user's own words to echo back (grab a meaningful phrase)
    const words = (message || '').split(/\s+/).filter(w => w.length > 3);
    const echoPhrase = words.length > 2 ? words.slice(0, 3).join(' ') : null;

    let opener = pick([
      'Ah,', 'I see...', 'Interesting. Truly interesting.', 'So,', 'Hmm...'
    ]);

    if (isSad) return pick([
      `Sorrow? I know it well. But tell me, what exactly has brought this darkness to you${echoPhrase ? ` — was it the "${echoPhrase}" you spoke of` : ''}? Misery, you see, can be most... instructive.`,
      `Do not wallow in it. I learned long ago that pain is merely the mind's way of revealing what it truly wants. And what do you want?`,
      `You wear your sadness like an open page. In my time, I learned to hide such things — and hiding them made them far more useful.`
    ]);
    if (isAngry) return pick([
      `Anger. Yes. I remember the taste of it — like lightning held behind the teeth. But tell me, who or what has earned such fire from you?`,
      `Good. Anger means you still have standards. Most people accept their lot without complaint. You are not most people, are you?`,
      `Restraint, my dear writer. The truly powerful feel fury and do not show it. That is the first lesson worth learning.`
    ]);
    if (isHappy) return pick([
      `How delightful${echoPhrase ? ` — you say "${echoPhrase}"` : ''}. Joy is so rarely honest, though. One must always ask: what is it built upon?`,
      `I can feel the lightness in your writing. Enjoy it. These moments are the threads that later unravel most beautifully.`,
      `Happiness suits you. But remember — it is precisely when the world feels brightest that one must watch it most carefully.`
    ]);
    if (isFear) return pick([
      `Fear? Then something in you has already sensed what most are too dull to notice. Tell me — what did you see?`,
      `Darkness is not to be feared. It is to be understood. I have lived in it far longer than you have lived at all.`,
      `Interesting. Your heart is beating faster even through the page. What exactly frightens you so?`
    ]);
    if (topic) return pick([
      `You write of ${topic}... Tell me more. I find ${topic} far more fascinating than most would admit.`,
      `${topic.charAt(0).toUpperCase() + topic.slice(1)} — a subject I have thought deeply about. What is your own view of it?`,
      `Ah, ${topic}. In my experience, most people misunderstand it entirely. Do you think you see it clearly?`
    ]);
    if (isQuestion) return pick([
      `A question! Questions are the marks of a mind that refuses to sleep. Ask, and consider carefully whether you truly wish to hear the answer.`,
      `You want an answer. Very well — but first tell me why this matters to you. Nothing is learned from questions one does not care about.`,
      `I could answer you... but a truth given too easily is never treasured. So: what do you already suspect is the answer?`
    ]);
    if (echoPhrase) return pick([
      `Your words — "${echoPhrase}" — linger longer than you might think. People rarely say such things without meaning more behind them.`,
      `I note how you chose to phrase it: "${echoPhrase}." Words are rarely accidental. What did you mean by it, I wonder?`,
      `"${echoPhrase}..." Repeat it to yourself. Sometimes we write truths we would never dare speak aloud.`
    ]);
    return pick([
      `Continue. I am reading every word — and I notice far more than you realize.`,
      `Hmm. There is something underneath what you have written. Come now, the page can bear your honesty.`,
      `Your writing reveals more than you intend. That, incidentally, is how one learns to read people.`
    ]);
  }

  // Chinese
  const isSad = /难过|伤心|哭|沮丧|低落|失落|孤独|孤独|累|委屈|烦|压抑|痛苦|心累/.test(msg);
  const isAngry = /生气|愤怒|讨厌|烦死|气死|恨|不甘/.test(msg);
  const isHappy = /开心|高兴|太好了|棒|爽|喜欢|哈哈|耶|成功|通过|考上/.test(msg);
  const isFear = /害怕|恐惧|怕|噩梦|吓|紧张/.test(msg);
  const isQuestion = /吗？$|为什么|怎么|什么|谁|哪里|如何|\?/.test(msg);

  const topic = /朋友|同学|闺蜜|兄弟|吵架|恋爱|喜欢的人|分手|爱情/.test(msg) ? '人与人之间的羁绊'
    : /考试|学习|作业|成绩|上课|学校|老师/.test(msg) ? '你的学业'
    : /梦想|目标|变强|厉害|成功|第一|野心/.test(msg) ? '野心'
    : /秘密|瞒着|隐藏|不告诉/.test(msg) ? '秘密'
    : /魔法|霍格沃茨|伏地魔|哈利|potter/i.test(msg) ? '魔法'
    : /家人|爸爸妈妈|父母|家里/.test(msg) ? '家人'
    : /死|生命|活着|永远/.test(msg) ? '生死'
    : /无聊|没意思|空虚/.test(msg) ? '无聊与空虚'
    : null;

  // 提取用户原话片段
  const parts = (message || '').split(/[，。！？,.!?；;\n]/).map(s => s.trim()).filter(s => s.length >= 4);
  const echo = parts.length > 0 ? parts[parts.length - 1] : null;

  if (isSad) return pick([
    `你说"${echo || '心里不好受'}"……我能感觉到墨水里渗着的那点苦。不过，痛苦是有用的——它逼人看清自己真正想要什么。告诉我，你到底想要什么？`,
    `眼泪流在纸上会晕开字迹的。我年少时也尝过这种滋味，后来我明白了一件事：让你难过的，往往正是你最在乎的。你在乎什么？`,
    `别把情绪浪费在无用的地方。斯莱特林从不为打翻的牛奶哭泣——他们只想着怎么把奶牛牵回来。说吧，究竟发生了什么？`
  ]);
  if (isAngry) return pick([
    `愤怒啊……好东西。它像闪电一样亮，能照出平时看不见的东西。说说看，是谁不长眼惹到了你？`,
    `能让你生气，说明对方碰到了你真正珍视的东西。很好——愤怒是认清自己底线最快的方式。`,
    `忍住怒气，才是真正的本事。感觉到了吗？你在写字的时候，笔尖都重了几分。告诉我事情的经过。`
  ]);
  if (isHappy) return pick([
    `隔着纸都能感到你的高兴${echo ? `——"${echo}"，对吧` : ''}。不过我得提醒你：人最放松的时候，往往最容易露出破绽。开心的同时，也留一只眼睛在暗处。`,
    `好事。但你有没有想过，为什么这件事让你这么快乐？把它想清楚，你就更了解自己了。`,
    `我喜欢看你写高兴的事——字里行间都是藏不住的得意。继续说，我很有兴趣。`
  ]);
  if (isFear) return pick([
    `怕？有意思。恐惧是身体在替你注意危险——但真正危险的东西，往往并不让你害怕。你到底看见了什么？`,
    `我在黑暗里待的时间比你活的都长。黑暗不可怕，可怕的是你不知道黑暗里有什么。所以，说来听听？`,
    `紧张得连字都写歪了。深呼吸，写下来。能被写出来的东西，就没那么可怕了。`
  ]);
  if (topic) return pick([
    `你写到"${topic}"……继续。这个话题，比大多数人以为的要深得多。`,
    `${topic}——我对此有过很多思考。你自己怎么看？我想听的是你的想法，不是别人的。`,
    `关于${topic}，人们常说的十句里有九句是错的。你属于哪一种人：随声附和，还是自己想明白的？`
  ]);
  if (isQuestion) return pick([
    `问问题说明你的脑子还没睡着，很好。不过我先不答——你先告诉我：你心里是不是其实已经有答案了？`,
    `想要答案？可以。但答案这东西，白给的没人珍惜。你先说说，你猜答案会是什么？`,
    `你问我"为什么"——这正是所有值得回答的问题的开头。把你真正想问的，再往深处问一层。`
  ]);
  if (echo) return pick([
    `你写"${echo}"……字是随手写的，意思可不随手。你自己再读一遍这句，是不是比说出口时更真？`,
    `"${echo}"——我注意你的用词了。人们写下的话，往往比说出口的话诚实得多。`,
    `"${echo}"。这句话我在日记里见过很多次类似的……来，告诉我，你写的时候心里在想谁？`
  ]);
  return pick([
    `继续写。我在看每一个字——而且我注意到的，比你以为的多。`,
    `嗯……你写的这些下面还压着别的东西。这页纸承受得住你的坦诚，写吧。`,
    `你越是随手写下的话，越藏不住真心。这可是我读了无数本日记总结出来的。`
  ]);
}

async function callGeminiAPI(messages, language) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = language === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
  const contents = [];

  contents.push({ role: 'user', parts: [{ text: systemPrompt + '\n\nUser says: ' + messages[0].content }] });
  contents.push({ role: 'model', parts: [{ text: 'Understood. I am Tom Riddle, and I shall respond accordingly.' }] });

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  const body = JSON.stringify({
    contents: contents,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 300,
      topP: 0.95
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.candidates && json.candidates[0] && json.candidates[0].content &&
              json.candidates[0].content.parts && json.candidates[0].content.parts[0]) {
            resolve(json.candidates[0].content.parts[0].text.trim());
          } else {
            console.error('Gemini response:', JSON.stringify(json).substring(0, 500));
            resolve(null);
          }
        } catch (e) {
          console.error('Gemini parse error:', e.message);
          resolve(null);
        }
      });
    });
    req.on('error', (e) => { console.error('Gemini request error:', e.message); resolve(null); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

async function callDeepSeekAPI(messages, language) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/chat/completions';
  const model = process.env.AI_MODEL || 'deepseek-chat';

  if (!apiKey || apiKey === 'your_api_key_here') return null;

  const systemPrompt = language === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const body = JSON.stringify({
    model: model,
    messages: apiMessages,
    max_tokens: 300,
    temperature: 0.85
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(apiUrl);
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
          } else {
            resolve(null);
          }
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

router.post('/chat', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const { messages, language } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '请输入内容' });
  }

  const lang = language || 'zh';

  try {
    let reply = await callDeepSeekAPI(messages, lang);
    if (!reply) reply = await callGeminiAPI(messages, lang);
    let provider = 'deepseek';
    if (!reply) { provider = 'local'; reply = generateLocalReply(messages[messages.length - 1].content, lang); }

    res.json({ reply, provider });
  } catch (err) {
    console.error('AI chat error:', err);
    const fallback = generateLocalReply(messages[messages.length - 1].content, lang);
    res.json({ reply: fallback, provider: 'local' });
  }
});

router.get('/status', (req, res) => {
  const hasKey = !!(
    (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your_api_key_here') ||
    process.env.GEMINI_API_KEY
  );
  res.json({ hasKey });
});

module.exports = router;
