import { Request, Response } from 'express';
import { getGlobalDatabase } from '../../repo/sqlite';

export async function getTickets(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;
    
    const db = getGlobalDatabase();
    let query = 'SELECT * FROM cases WHERE 1=1';
    const params: any[] = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = db.prepare(countQuery).get(...params) as { count: number };
    
    // Get paginated results
    query += ' ORDER BY last_message_at_ms DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const tickets = db.prepare(query).all(...params);
    
    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit)
      }
    });
  } catch (error) {
    console.error('[Tickets] Error getting tickets:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
}

export async function getTicketById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const db = getGlobalDatabase();
    
    const ticket = db.prepare('SELECT * FROM cases WHERE case_id = ?').get(id);
    
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    
    res.json({ ticket });
  } catch (error) {
    console.error('[Tickets] Error getting ticket:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
}
