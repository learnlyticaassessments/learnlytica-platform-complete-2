import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function visitorApiPlugin() {
  const visitors = [];
  return {
    name: 'visitor-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const method = String(req.method || 'GET').toUpperCase();
        const url = String(req.url || '');

        if (method === 'GET' && url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ status: 'ok', service: 'visitor-checkin-api' }));
          return;
        }

        if (method === 'GET' && url === '/api/visitors/today') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ visitors }));
          return;
        }

        if (method === 'POST' && url === '/api/visitors/check-in') {
          let body = '';
          req.on('data', (chunk) => {
            body += String(chunk || '');
          });
          req.on('end', () => {
            let payload = {};
            try {
              payload = body ? JSON.parse(body) : {};
            } catch {
              payload = {};
            }
            const visitorId = `VIS-${String(visitors.length + 1).padStart(4, '0')}`;
            visitors.push({ visitorId, status: 'Checked In', ...payload });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 201;
            res.end(JSON.stringify({ visitorId, status: 'Checked In' }));
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), visitorApiPlugin()]
});
