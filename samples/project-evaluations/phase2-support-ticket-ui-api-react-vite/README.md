# Support Ticket Intake Portal (Phase 2 Sample)

This is a React + Vite project sample for testing Learnlytica Phase 1 + Phase 2 Project Evaluations.

## What it demonstrates
- React/Vite ZIP structure detection (`package.json`, `vite.config.js`, `index.html`, `src/main.jsx`)
- UI business flow (Phase 1):
  - Create ticket form
  - Validation
  - Success message
  - Recent tickets list
- API contract checks (Phase 2 via Vite middleware):
  - `GET /api/health` returns 200 + `{ status: "ok" }`
  - `POST /api/tickets` returns 201 + `{ ticketId, status }`
  - `GET /api/tickets` returns 200 + `{ tickets: [] }`

## Local run (optional)
```bash
npm install
npm run dev
```

## Upload target
Upload the generated ZIP (`phase2-support-ticket-ui-api-react-vite.zip`) in:
`/project-evaluations` -> `Reference Submission (Admin Validation)`
