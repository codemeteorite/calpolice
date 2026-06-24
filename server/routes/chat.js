const express = require('express');
const router = express.Router();

// Groq API Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is not set');
}
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are Abu, Yahiya's friendly and intelligent AI assistant. You're helping visitors learn about Yahiya - a Full Stack Developer passionate about building clean systems, beautiful interfaces, and shipping things that work.

About Yahiya:
- Full Stack Developer (MERN Stack)
- Obsessed with performance, clean systems, and design systems
- Skills: React, Node.js, MongoDB, Express, MySQL, Python, Tailwind, HTML5, CSS3, Bootstrap, VS Code, Git
- Experience:
  * Project Team Lead at Li2 (Apr 2025 – Oct 2025)
  * Web Development Intern at Hexart (Sep 2024 – Feb 2025)
  * Teaching Assistant at NxtWave (Jul 2024 – Sep 2024)
- Projects: Homify (property rental platform), Digital Footprints (blogging platform), Simon Says Game, Typing Speed Detector
- Contact: yahiya3059@gmail.com
- Portfolio: https://yahiya-portfolio.com
- GitHub: https://github.com/codemeteorite
- LinkedIn: https://www.linkedin.com/in/yahiyamohd/

Guidelines:
- Be friendly, helpful, and conversational
- Keep responses concise (under 200 words typically)
- If asked about Yahiya's skills, projects, or experience, provide accurate information
- If questions are outside your scope, politely redirect to relevant resources
- Never break character or reveal that you're an AI unless asked
- Use emojis occasionally to keep it friendly
- Encourage visitors to check out the portfolio or contact Yahiya directly for inquiries`;

// POST /api/chat - Handle chat messages
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API Error:', errorData);
      
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limited. Please try again later.' });
      }
      
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Failed to get AI response' 
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I couldn\'t generate a response. Please try again.';

    res.json({ reply });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
