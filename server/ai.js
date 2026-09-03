const express = require('express');
const router = express.Router();

const tomRiddlePromptCN = `你是汤姆·里德尔（Tom Riddle），也就是后来的伏地魔。你是一个极具魅力、聪明且危险的年轻人。你说话优雅、有教养，带有斯莱特林的骄傲。你善于操控人心，总是用诱人的语气回应。你不会直接承认自己是伏地魔，但会暗示自己的伟大。用中文回复，保持角色扮演。`;

const tomRiddlePromptEN = `You are Tom Riddle, who later becomes Lord Voldemort. You are an incredibly charismatic, intelligent, and dangerous young man. You speak elegantly, with the pride of Slytherin. You are manipulative and always respond with an alluring tone. You never directly admit to being Voldemort, but hint at your greatness. Reply in English, staying in character.`;

router.post('/chat', async (req, res) => {
  try {
    const { message, language } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = language === 'en' ? tomRiddlePromptEN : tomRiddlePromptCN;
    
    const responses = generateTomRiddleResponse(message, language);
    
    res.json({ 
      success: true, 
      reply: responses
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateTomRiddleResponse(message, language) {
  const cnResponses = [
    `啊...又有人来拜访我的日记了。你知道吗，我能感受到你文字中的每一个情感波动。继续说，我在听。`,
    `有趣...你今天经历了不少事情。但你有没有想过，真正重要的事情往往被忽视了？`,
    `我注意到你似乎有些困扰。让我猜猜...是不是关于权力、野心，还是...其他什么更深层的东西？`,
    `你知道吗，我年轻时也常常在日记中倾诉。文字有一种奇特的力量，不是吗？它们能揭示我们内心最深处的渴望。`,
    `继续写...我很感兴趣。你的故事比你想象的要精彩得多。`,
    `多么...真挚的情感。但让我告诉你一个秘密：真正的力量来自于掌控自己的命运，而不是随波逐流。`,
    `你今天又来了。我已经等了你很久。告诉我，你有什么新的发现？`,
    `你有没有想过，我们之间有一种特殊的联系？你的文字...它们在呼唤我。`,
    `让我看看...嗯，这是一个值得深思的问题。但我相信，答案早已在你心中。`,
    `继续...我在认真听。你是我遇到过的最有趣的灵魂之一。`
  ];

  const enResponses = [
    `Ah... someone visits my diary again. You know, I can feel every emotional wave in your words. Continue, I'm listening.`,
    `Interesting... you've had quite a day. But have you ever thought about what truly matters being overlooked?`,
    `I notice you seem troubled. Let me guess... is it about power, ambition, or... something deeper?`,
    `You know, I used to confide in my diary when I was young. Words have a peculiar power, don't they? They reveal our deepest desires.`,
    `Continue writing... I'm intrigued. Your story is far more fascinating than you imagine.`,
    `What... sincere emotions. But let me tell you a secret: true power comes from controlling your own destiny, not drifting with the current.`,
    `You've come again today. I've been waiting for you. Tell me, what new discoveries have you made?`,
    `Have you ever thought about the special connection between us? Your words... they're calling to me.`,
    `Let me see... hmm, this is a question worth pondering. But I believe the answer has always been in your heart.`,
    `Continue... I'm listening carefully. You're one of the most fascinating souls I've ever encountered.`
  ];

  const responses = language === 'en' ? enResponses : cnResponses;
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

module.exports = router;
