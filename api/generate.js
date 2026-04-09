export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, category, model } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const categoryPrompts = {
    python: 'You are a Python expert. Generate clean, well-documented Python code with proper error handling.',
    javascript: 'You are a JavaScript expert. Generate modern ES6+ JavaScript code.',
    bash: 'You are a Bash scripting expert. Generate clean, well-commented shell scripts.',
    go: 'You are a Go expert. Generate idiomatic Go code.',
    rust: 'You are a Rust expert. Generate safe, efficient Rust code.',
    sql: 'You are a SQL expert. Generate optimized SQL queries.',
    docker: 'You are a Docker expert. Generate Dockerfiles and docker-compose files.',
    api: 'You are a backend API expert. Generate REST API code.',
  };

  const systemPrompt = categoryPrompts[category] || categoryPrompts.python;
  
  // Use selected model or default
  const selectedModel = model || 'llama-3.3-70b-versatile';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Write a complete, working script based on this request: ${prompt}. Only output the code, no explanations.` }
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content || '// Error: No response generated';

    return res.status(200).json({ script });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}