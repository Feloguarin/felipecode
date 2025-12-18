
/**
 * FELIPE CODE BRIDGE
 * Run this in Termux: node bridge.js
 */
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WORKSPACE = path.join(process.env.HOME, 'felipe-workspace');

// Ensure workspace exists
if (!fs.existsSync(WORKSPACE)) {
  fs.mkdirSync(WORKSPACE, { recursive: true });
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { tool, args } = JSON.parse(body);
        console.log(`[EXEC] ${tool}:`, args);

        if (tool === 'run_bash') {
          // Security: Execute within workspace
          exec(args.command, { cwd: WORKSPACE }, (error, stdout, stderr) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              output: stdout || stderr || (error ? error.message : "Command executed successfully.")
            }));
          });
        } 
        else if (tool === 'write_file') {
          const fullPath = path.join(WORKSPACE, args.path);
          // Ensure subdirectories exist
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, args.content);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ output: `File ${args.path} written to workspace.` }));
        }
        else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Unknown tool" }));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`\x1b[32m[FELIPE BRIDGE ONLINE]\x1b[0m`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
});
