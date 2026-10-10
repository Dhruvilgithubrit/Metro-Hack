import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'db.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ complaints: [] }));
}

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.url === '/api/sync' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(db.complaints));
  }

  if (req.url === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const db = readDb();
        const existing = new Map(db.complaints.map(c => [c.id, c]));

        for (const inc of incoming) {
          const ext = existing.get(inc.id);
          if (!ext) {
            existing.set(inc.id, inc);
          } else {
            const extTs = ext.statusHistory?.[ext.statusHistory.length - 1]?.ts || ext.ts || 0;
            const incTs = inc.statusHistory?.[inc.statusHistory.length - 1]?.ts || inc.ts || 0;
            
            if (incTs > extTs) {
              ext.status = inc.status;
              ext.statusHistory = inc.statusHistory;
            }
            if (inc.reply && (!ext.reply || inc.reply.ts > (ext.reply.ts || 0))) {
              ext.reply = inc.reply;
            }
            if (inc.dept && inc.ts > (ext.ts || 0)) {
               ext.dept = inc.dept;
               ext.band = inc.band;
               ext.urgency = inc.urgency;
            }
          }
        }

        db.complaints = Array.from(existing.values());
        writeDb(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: incoming.length }));
      } catch (err) {
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(8787, () => {
  console.log('Sync server running on port 8787');
});
