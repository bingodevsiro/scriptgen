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

async function generateScript(prompt, category) {
    const categoryPrompts = {
        general: 'You are a helpful coding assistant. Generate clean, working code.',
        python: 'You are a Python expert. Generate clean, well-documented Python code.',
        javascript: 'You are a JavaScript expert. Generate modern ES6+ JavaScript code.',
        bash: 'You are a Bash scripting expert. Generate clean shell scripts.',
        api: 'You are a backend API expert. Generate REST API code.',
        automation: 'You are an automation expert. Generate scripts for task automation.',
    };

    const systemPrompt = categoryPrompts[category] || categoryPrompts.general;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Write a complete, working script based on this request: ${prompt}. Only output the code, no explanations.` }
                ],
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '// Error: No response generated';
    } catch (error) {
        console.error('Groq API error:', error);
        return `// Error: ${error.message}`;
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/generate') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { prompt, category } = JSON.parse(body);
                const script = await generateScript(prompt, category || 'general');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ script }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
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

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});