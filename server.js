const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

// Model definitions
const MODELS = {
    // Groq models
    'groq-llama-3.3-70b': {
        provider: 'groq',
        name: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B (Groq)'
    },
    'groq-llama-3.1-70b': {
        provider: 'groq',
        name: 'llama-3.1-70b-versatile',
        label: 'Llama 3.1 70B (Groq)'
    },
    'groq-mixtral-8x7b': {
        provider: 'groq',
        name: 'mixtral-8x7b-32768',
        label: 'Mixtral 8x7B (Groq)'
    },
    // Gemini models
    'gemini-2.0-flash': {
        provider: 'gemini',
        name: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash'
    },
    'gemini-1.5-flash': {
        provider: 'gemini',
        name: 'gemini-1.5-flash',
        label: 'Gemini 1.5 Flash'
    },
    'gemini-1.5-pro': {
        provider: 'gemini',
        name: 'gemini-1.5-pro',
        label: 'Gemini 1.5 Pro'
    }
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

// Groq API call
async function generateWithGroq(prompt, category, model) {
    const systemPrompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
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
        throw new Error(err.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// Gemini API call
async function generateWithGemini(prompt, category, model) {
    const systemPrompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;
    
    const fullPrompt = `${systemPrompt}\n\nWrite a complete, working script based on this request: ${prompt}\n\nRequirements:\n- The code should be clean, well-commented, and production-ready\n- Only output the code, no explanations\n- Include proper error handling`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return content || '';
}

// Main generate function
async function generateScript(prompt, category, modelKey) {
    const modelConfig = MODELS[modelKey];
    
    if (!modelConfig) {
        throw new Error('Invalid model selected');
    }

    if (modelConfig.provider === 'groq') {
        if (!GROQ_API_KEY) {
            throw new Error('Groq API key not configured');
        }
        return await generateWithGroq(prompt, category, modelConfig.name);
    } else if (modelConfig.provider === 'gemini') {
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured');
        }
        return await generateWithGemini(prompt, category, modelConfig.name);
    }

    throw new Error('Unknown model provider');
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
                
                if (!model) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Model is required' }));
                    return;
                }
                
                const script = await generateScript(prompt, category || 'general', model);
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

    if (req.method === 'GET' && req.url === '/api/models') {
        const modelsList = Object.entries(MODELS).map(([key, config]) => ({
            key,
            label: config.label,
            provider: config.provider
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ models: modelsList }));
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
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