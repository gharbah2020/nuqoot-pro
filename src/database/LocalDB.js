import * as SQLite from 'expo-sqlite';

class LocalDB {
  constructor() {
    this.db = null;
  }

  async getDB() {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('nuqoot_pro.db');
      await this.initTables();
    }
    return this.db;
  }

  async initTables() {
    try {
      const db = await this.getDB();
      
      // Events Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Records Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          person_name TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('given', 'received')),
          date TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          relationship TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        );
      `);

      // Settings Table (Currency, App Lock, etc.)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Default Currency Setting
      const currency = await this.getSetting('currency');
      if (!currency) {
        await this.saveSetting('currency', 'ج.م');
      }

    } catch (error) {
      console.error('Error initializing tables:', error);
    }
  }

  // Settings Helper
  async getSetting(key, defaultValue = '') {
    try {
      const db = await this.getDB();
      const result = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?;', [key]);
      return result ? result.value : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  async saveSetting(key, value) {
    try {
      const db = await this.getDB();
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
        [key, value]
      );
    } catch (e) {
      console.error('Error saving setting:', e);
    }
  }

  // Dashboard Overview Stats
  async getDashboardStats() {
    try {
      const db = await this.getDB();
      const totalEvents = await db.getFirstAsync('SELECT COUNT(*) as count FROM events;');
      const totalRecords = await db.getFirstAsync('SELECT COUNT(*) as count FROM records;');
      const totals = await db.getFirstAsync(`
        SELECT 
          SUM(CASE WHEN type = 'given' THEN amount ELSE 0 END) as total_given,
          SUM(CASE WHEN type = 'received' THEN amount ELSE 0 END) as total_received
        FROM records;
      `);

      const given = totals?.total_given || 0;
      const received = totals?.total_received || 0;
      const balance = received - given;

      return {
        eventsCount: totalEvents?.count || 0,
        recordsCount: totalRecords?.count || 0,
        totalGiven: given,
        totalReceived: received,
        netBalance: balance
      };
    } catch (e) {
      console.error('Error getting dashboard stats:', e);
      return { eventsCount: 0, recordsCount: 0, totalGiven: 0, totalReceived: 0, netBalance: 0 };
    }
  }

  // Events Operations
  async getAllEvents() {
    try {
      const db = await this.getDB();
      return await db.getAllAsync(`
        SELECT e.*, 
          COUNT(r.id) as records_count,
          SUM(CASE WHEN r.type = 'given' THEN r.amount ELSE 0 END) as total_given,
          SUM(CASE WHEN r.type = 'received' THEN r.amount ELSE 0 END) as total_received
        FROM events e
        LEFT JOIN records r ON e.id = r.event_id
        GROUP BY e.id
        ORDER BY e.date DESC, e.id DESC;
      `);
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  async addEvent(event) {
    try {
      const db = await this.getDB();
      const result = await db.runAsync(
        'INSERT INTO events (name, date, notes) VALUES (?, ?, ?);',
        [event.name.trim(), event.date, event.notes || '']
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  async updateEvent(id, event) {
    try {
      const db = await this.getDB();
      await db.runAsync(
        'UPDATE events SET name = ?, date = ?, notes = ? WHERE id = ?;',
        [event.name.trim(), event.date, event.notes || '', id]
      );
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(id) {
    try {
      const db = await this.getDB();
      await db.runAsync('DELETE FROM records WHERE event_id = ?;', [id]);
      await db.runAsync('DELETE FROM events WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Records Operations
  async getAllRecords() {
    try {
      const db = await this.getDB();
      return await db.getAllAsync(`
        SELECT r.*, e.name as event_name
        FROM records r
        LEFT JOIN events e ON r.event_id = e.id
        ORDER BY r.date DESC, r.id DESC;
      `);
    } catch (error) {
      console.error('Error getting all records:', error);
      return [];
    }
  }

  async getRecordsByEvent(eventId, filterType = 'all', sortBy = 'date_desc') {
    try {
      const db = await this.getDB();
      let query = `
        SELECT r.*, e.name as event_name
        FROM records r
        LEFT JOIN events e ON r.event_id = e.id
        WHERE r.event_id = ?
      `;
      const params = [eventId];

      if (filterType === 'given') {
        query += ` AND r.type = 'given'`;
      } else if (filterType === 'received') {
        query += ` AND r.type = 'received'`;
      }

      if (sortBy === 'amount_desc') {
        query += ` ORDER BY r.amount DESC`;
      } else if (sortBy === 'amount_asc') {
        query += ` ORDER BY r.amount ASC`;
      } else if (sortBy === 'name') {
        query += ` ORDER BY r.person_name ASC`;
      } else if (sortBy === 'date_asc') {
        query += ` ORDER BY r.date ASC, r.id ASC`;
      } else {
        query += ` ORDER BY r.date DESC, r.id DESC`;
      }

      return await db.getAllAsync(query, params);
    } catch (error) {
      console.error('Error getting records by event:', error);
      return [];
    }
  }

  async addRecord(record) {
    try {
      const db = await this.getDB();
      const result = await db.runAsync(
        `INSERT INTO records 
        (event_id, person_name, amount, type, date, phone, address, relationship, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          record.event_id,
          record.person_name.trim(),
          record.amount,
          record.type,
          record.date,
          record.phone || '',
          record.address || '',
          record.relationship || '',
          record.notes || ''
        ]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error adding record:', error);
      throw error;
    }
  }

  async updateRecord(id, record) {
    try {
      const db = await this.getDB();
      await db.runAsync(
        `UPDATE records 
        SET person_name = ?, amount = ?, type = ?, date = ?, phone = ?, address = ?, relationship = ?, notes = ?
        WHERE id = ?;`,
        [
          record.person_name.trim(),
          record.amount,
          record.type,
          record.date,
          record.phone || '',
          record.address || '',
          record.relationship || '',
          record.notes || '',
          id
        ]
      );
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  }

  async deleteRecord(id) {
    try {
      const db = await this.getDB();
      await db.runAsync('DELETE FROM records WHERE id = ?;', [id]);
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  }

  async searchPeople(query) {
    try {
      const db = await this.getDB();
      const searchTerm = `%${query.trim()}%`;
      return await db.getAllAsync(`
        SELECT DISTINCT person_name, phone, address, relationship
        FROM records
        WHERE person_name LIKE ? OR phone LIKE ?
        LIMIT 10;
      `, [searchTerm, searchTerm]);
    } catch (error) {
      console.error('Error searching people:', error);
      return [];
    }
  }
}

export default new LocalDB();
