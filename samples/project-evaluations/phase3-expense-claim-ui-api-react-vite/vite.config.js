import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function expenseApiPlugin() {
  const claims = [];
  return {
    name: 'expense-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const method = String(req.method || 'GET').toUpperCase();
        const url = String(req.url || '');

        if (method === 'GET' && url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ status: 'ok', service: 'expense-claims-api' }));
          return;
        }

        if (method === 'GET' && url === '/api/claims') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ claims }));
          return;
        }

        if (method === 'POST' && url === '/api/claims') {
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
            const claimId = `CLM-${String(claims.length + 1).padStart(4, '0')}`;
            claims.push({ claimId, status: 'Pending Review', ...payload });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 201;
            res.end(JSON.stringify({ claimId, status: 'Pending Review' }));
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), expenseApiPlugin()]
});
