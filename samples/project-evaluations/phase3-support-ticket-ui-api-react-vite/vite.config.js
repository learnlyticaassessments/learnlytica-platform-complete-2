import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function phase2ApiPlugin() {
  const tickets = [];
  return {
    name: 'phase2-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const method = String(req.method || 'GET').toUpperCase();
        const url = String(req.url || '');

        if (method === 'GET' && url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ status: 'ok', service: 'support-ticket-api' }));
          return;
        }

        if (method === 'GET' && url === '/api/tickets') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ tickets }));
          return;
        }

        if (method === 'POST' && url === '/api/tickets') {
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
            const ticketId = `TKT-${String(tickets.length + 1).padStart(4, '0')}`;
            const ticket = { ticketId, status: 'Open', ...payload };
            tickets.push(ticket);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 201;
            res.end(JSON.stringify({ ticketId, status: 'Open' }));
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), phase2ApiPlugin()]
});
