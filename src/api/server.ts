import express from 'express';
import cors from 'cors';
import { getTickets, getTicketById } from './handlers/tickets';
import { getStatsOverview } from './handlers/stats';
import { getCruiseReports, getCruiseReportById } from './handlers/reports';

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// GET /api/stats/overview - Dashboard statistics
app.get('/api/stats/overview', getStatsOverview);

// GET /api/tickets - Ticket list with pagination
app.get('/api/tickets', getTickets);

// GET /api/tickets/:id - Single ticket details
app.get('/api/tickets/:id', getTicketById);

// GET /api/cruise-reports - Cruise report list
app.get('/api/cruise-reports', getCruiseReports);

// GET /api/cruise-reports/:id - Single report detail
app.get('/api/cruise-reports/:id', getCruiseReportById);

export function startAPIServer() {
  app.listen(PORT, () => {
    console.log(`[API] Server running on port ${PORT}`);
  });
  return app;
}

export { app };
