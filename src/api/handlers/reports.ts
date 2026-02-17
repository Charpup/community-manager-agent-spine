import { Request, Response } from 'express';
import { getGlobalDatabase } from '../../repo/sqlite';

export async function getCruiseReports(req: Request, res: Response) {
  try {
    const db = getGlobalDatabase();
    
    // Query cruise logs from database
    const reports = db.prepare(
      'SELECT id, timestamp, report_md, stats_json, duration_ms FROM cruise_logs ORDER BY timestamp DESC'
    ).all() || [];
    
    res.json({ reports });
  } catch (error) {
    console.error('[Reports] Error getting cruise reports:', error);
    // If table doesn't exist, return empty array
    res.json({ reports: [] });
  }
}

export async function getCruiseReportById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const db = getGlobalDatabase();
    
    const report = db.prepare(
      'SELECT * FROM cruise_logs WHERE id = ?'
    ).get(id);
    
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    
    res.json({ report });
  } catch (error) {
    console.error('[Reports] Error getting cruise report:', error);
    res.status(500).json({ error: 'Failed to get cruise report' });
  }
}
