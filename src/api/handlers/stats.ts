import { Request, Response } from 'express';
import { getGlobalDatabase } from '../../repo/sqlite';

export async function getStatsOverview(req: Request, res: Response) {
  try {
    const db = getGlobalDatabase();
    
    // Get total cases
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM cases').get() as { count: number };
    
    // Get high severity pending cases
    const highPriorityResult = db.prepare(
      "SELECT COUNT(*) as count FROM cases WHERE severity IN ('high', 'critical', 'urgent') AND status NOT IN ('CLOSED', 'RESOLVED')"
    ).get() as { count: number };
    
    // Get category distribution
    const categoryResults = db.prepare(
      'SELECT category, COUNT(*) as count FROM cases GROUP BY category'
    ).all() as Array<{ category: string; count: number }>;
    
    const categoryDistribution: Record<string, number> = {};
    categoryResults.forEach(row => {
      categoryDistribution[row.category] = row.count;
    });
    
    // Get status distribution
    const statusResults = db.prepare(
      'SELECT status, COUNT(*) as count FROM cases GROUP BY status'
    ).all() as Array<{ status: string; count: number }>;
    
    const statusDistribution: Record<string, number> = {};
    statusResults.forEach(row => {
      statusDistribution[row.status] = row.count;
    });
    
    res.json({
      totalTickets: totalResult.count,
      pendingHighPriority: highPriorityResult.count,
      categoryDistribution,
      statusDistribution,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[Stats] Error getting overview:', error);
    res.status(500).json({ error: 'Failed to get stats overview' });
  }
}
