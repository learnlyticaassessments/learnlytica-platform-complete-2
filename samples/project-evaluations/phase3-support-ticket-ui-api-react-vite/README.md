# Support Ticket Intake Portal (Phase 3 Sample)

This is a React + Vite project sample for testing Learnlytica Phase 3 (UI + API Integration) Project Evaluations.

## What it demonstrates
- React/Vite ZIP structure detection (`package.json`, `vite.config.js`, `index.html`, `src/main.jsx`)
- UI business flow (Phase 1):
  - Create ticket form
  - Validation
  - Success message
  - Recent tickets list
- API contract checks (Phase 2/3 via Vite middleware):
  - `GET /api/health` returns 200 + `{ status: "ok" }`
  - `POST /api/tickets` returns 201 + `{ ticketId, status }`
  - `GET /api/tickets` returns 200 + `{ tickets: [] }`

## Local run (optional)
```bash
npm install
npm run dev
```

## Upload target
Upload the generated ZIP (`phase3-support-ticket-ui-api-react-vite.zip`) in:
`/project-evaluations` -> `Reference Submission (Admin Validation)`
