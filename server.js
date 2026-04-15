const http = require('http');
const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

// Model mapping
const MODELS = {
    'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile': 'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768': 'mixtral-8x7b-32768'
};

// Category system prompts
const CATEGORY_PROMPTS = {
    python: 'You are a Python expert. Generate clean, well-documented Python code following PEP 8 style guidelines. Include proper error handling and type hints where appropriate.',
    javascript: 'You are a JavaScript expert. Generate modern ES6+ JavaScript code. Use async/await, arrow functions, and proper error handling.',
    bash: 'You are a Bash scripting expert. Generate clean shell scripts that are POSIX-compatible and include proper error handling.',
    go: 'You are a Go expert. Generate idiomatic Go code following Go best practices. Use proper error handling and the standard library.',
    rust: 'You are a Rust expert. Generate idiomatic Rust code following Rust conventions. Use Result types for error handling.',
    sql: 'You are a SQL expert. Generate efficient, well-structured SQL queries. Use proper joins, indexes, and optimization techniques.',
    docker: 'You are a Docker and DevOps expert. Generate production-ready Dockerfiles and docker-compose files.',
    batch: 'You are a Windows Batch scripting expert. Generate scripts compatible with Windows cmd.exe.',
    api: 'You are a backend API expert. Generate RESTful API code with proper routing, middleware, and error handling.',
    general: 'You are a helpful coding assistant. Generate clean, working code.'
};

async function generateScript(prompt, category, model) {
    const systemPrompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;
    const modelToUse = MODELS[model] || 'llama-3.3-70b-versatile';

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Write a complete, working script based on this request: ${prompt}\n\nRequirements:\n- The code should be clean, well-commented, and production-ready\n- Only output the code, no explanations\n- Include proper error handling` }
                ],
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error('No response from AI model');
        }
        
        return content;
    } catch (error) {
        console.error('Groq API error:', error);
        throw error;
    }
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { prompt, category, model } = JSON.parse(body);
                
                if (!prompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Prompt is required' }));
                    return;
                }
                
                const script = await generateScript(prompt, category || 'general', model || 'llama-3.3-70b-versatile');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ script }));
            } catch (error) {
                console.error('Generate error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message || 'Failed to generate script' }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // Remove query string for file serving
    filePath = filePath.split('?')[0];
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});