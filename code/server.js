#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeGemini } from './build/utils/gemini.js';
import { ethicsCheckTool } from './build/tools/ethicsCheck.js';
import { ethicsGuideTool } from './build/tools/ethicsGuide.js';
import { criticalThinkingTool } from './build/tools/criticalThinking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
}
initializeGemini(apiKey);
console.log('✅ Gemini initialized');

// MIME type mapping
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

/**
 * Serve static file from public directory
 */
function serveStaticFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = req.url.split('?')[0]; // Remove query params

    // ===== Static Routes =====
    if (req.method === 'GET') {

        // Root & Login - serve login page
        if (url === '/' || url === '/login' || url === '/login.html') {
            serveStaticFile(path.join(__dirname, 'public', 'login.html'), res);
            return;
        }

        // Dashboard
        if (url === '/dashboard' || url === '/dashboard.html') {
            serveStaticFile(path.join(__dirname, 'public', 'dashboard.html'), res);
            return;
        }

        // Legacy UI (redirect to dashboard)
        if (url === '/ui.html') {
            res.writeHead(302, { 'Location': '/dashboard' });
            res.end();
            return;
        }

        // Static assets (CSS, JS, images)
        if (url.startsWith('/css/') || url.startsWith('/js/') || url.startsWith('/images/')) {
            serveStaticFile(path.join(__dirname, 'public', url), res);
            return;
        }
    }

    // ===== API Routes =====
    if (req.method === 'POST' && (req.url === '/call' || req.url === '/api/test')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const tool = data.tool;
                const args = data.args || data;
                let result;

                console.log(`📞 Calling tool: ${tool}`);

                switch (tool) {
                    case 'ethics_check':
                        result = await ethicsCheckTool({
                            conversation: args.conversation,
                            userRequest: args.userRequest,
                            context: args.context || undefined,
                            autoStore: true
                        });
                        break;
                    case 'ethics_guide':
                        const stakeholders = typeof args.stakeholders === 'string'
                            ? args.stakeholders.split(',').map(s => s.trim()).filter(Boolean)
                            : args.stakeholders;
                        result = await ethicsGuideTool({
                            scenario: args.scenario,
                            domain: args.domain || undefined,
                            stakeholders
                        });
                        break;
                    case 'critical_thinking':
                        result = await criticalThinkingTool({
                            aiResponse: args.aiResponse,
                            userRequest: args.userRequest,
                            context: args.context || undefined
                        });
                        break;
                    default:
                        throw new Error(`Unknown tool: ${tool}`);
                }

                console.log(`✅ ${tool} complete`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('❌ Error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        // 404 - Not Found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>404 - Not Found</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8f9fa; }
            .container { text-align: center; }
            h1 { color: #5a6c7d; font-size: 4rem; margin: 0; }
            p { color: #666; margin: 15px 0 25px; }
            a { color: #6b8e8e; text-decoration: none; font-weight: 600; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <p>Page not found</p>
            <a href="/">← Back to Home</a>
          </div>
        </body>
      </html>
    `);
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 Ethics Check Server running at http://localhost:${PORT}`);
    console.log(`   📄 Login: http://localhost:${PORT}/login`);
    console.log(`   📊 Dashboard: http://localhost:${PORT}/dashboard\n`);
});
