export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, category, model } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Model definitions
  const MODELS = {
    'groq-llama-3.3-70b': { provider: 'groq', name: 'llama-3.3-70b-versatile' },
    'groq-llama-3.1-8b': { provider: 'groq', name: 'llama-3.1-8b-instant' },
    'groq-qwen-32b': { provider: 'groq', name: 'qwen/qwen3-32b' },
    'gemini-2.5-flash': { provider: 'gemini', name: 'gemini-2.5-flash' },
  };

  const CATEGORY_PROMPTS = {
    python: 'You are a Python expert. Generate clean, well-documented Python code with proper error handling and type hints.',
    javascript: 'You are a JavaScript expert. Generate modern ES6+ JavaScript code with async/await.',
    bash: 'You are a Bash scripting expert. Generate clean, well-commented shell scripts.',
    go: 'You are a Go expert. Generate idiomatic Go code.',
    rust: 'You are a Rust expert. Generate safe, efficient Rust code.',
    sql: 'You are a SQL expert. Generate optimized SQL queries.',
    docker: 'You are a Docker expert. Generate Dockerfiles and docker-compose files.',
    batch: 'You are a Windows Batch scripting expert. Generate clean Windows CMD/Batch scripts.',
    api: 'You are a backend API expert. Generate REST API code.',
    swql: 'You are a ServiceNow SWQL expert. Generate clean ServiceNow Query Language queries and scripts for ServiceNow instances.',
  };

  const selectedModel = model || 'groq-llama-3.3-70b';
  const modelConfig = MODELS[selectedModel];

  if (!modelConfig) {
    return res.status(400).json({ error: 'Invalid model selected' });
  }

  const systemPrompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.python;
  const fullPrompt = `${systemPrompt}\n\nWrite a complete, working script based on this request: ${prompt}\n\nRequirements:\n- Clean, well-commented, production-ready code\n- Only output the code, no explanations\n- Include proper error handling`;

  try {
    let script = '';

    if (modelConfig.provider === 'groq') {
      if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelConfig.name,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Write a complete, working script: ${prompt}` }
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });
      }
      script = data.choices?.[0]?.message?.content || '';

    } else if (modelConfig.provider === 'gemini') {
      if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.name}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
      }
      script = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!script) {
      return res.status(500).json({ error: 'No response from AI model' });
    }

    return res.status(200).json({ script });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}