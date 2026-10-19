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
      
      // جدول المستخدمين (Auth)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

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

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      const currency = await this.getSetting('currency');
      if (!currency) await this.saveSetting('currency', 'ج.م');

    } catch (error) {
      console.error('Error init tables:', error);
    }
  }

  // --- Auth Functions ---
  async registerUser(email, password) {
    try {
      const db = await this.getDB();
      // فحص إذا كان الإيميل موجوداً مسبقاً
      const existingUser = await db.getFirstAsync('SELECT id FROM users WHERE email = ?;', [email]);
      if (existingUser) {
        return { success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل!' };
      }
      await db.runAsync('INSERT INTO users (email, password) VALUES (?, ?);', [email, password]);
      return { success: true };
    } catch (e) {
      return { success: false, message: 'حدث خطأ أثناء التسجيل' };
    }
  }

  async loginUser(email, password) {
    try {
      const db = await this.getDB();
      const user = await db.getFirstAsync('SELECT * FROM users WHERE email = ? AND password = ?;', [email, password]);
      return user;
    } catch (e) {
      return null;
    }
  }

  // --- Settings & Dashboard ---
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
    const db = await this.getDB();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [key, value]);
  }

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
      return {
        eventsCount: totalEvents?.count || 0,
        recordsCount: totalRecords?.count || 0,
        totalGiven: given,
        totalReceived: received,
        netBalance: received - given
      };
    } catch (e) {
      return { eventsCount: 0, recordsCount: 0, totalGiven: 0, totalReceived: 0, netBalance: 0 };
    }
  }

  // --- Events ---
  async getAllEvents() {
    const db = await this.getDB();
    return await db.getAllAsync(`
      SELECT e.*, 
        COUNT(r.id) as records_count,
        SUM(CASE WHEN r.type = 'given' THEN r.amount ELSE 0 END) as total_given,
        SUM(CASE WHEN r.type = 'received' THEN r.amount ELSE 0 END) as total_received
      FROM events e
      LEFT JOIN records r ON e.id = r.event_id
      GROUP BY e.id ORDER BY e.date DESC, e.id DESC;
    `);
  }

  async addEvent(event) {
    const db = await this.getDB();
    const result = await db.runAsync('INSERT INTO events (name, date, notes) VALUES (?, ?, ?);', [event.name.trim(), event.date, event.notes || '']);
    return result.lastInsertRowId;
  }

  async updateEvent(id, event) {
    const db = await this.getDB();
    await db.runAsync('UPDATE events SET name = ?, date = ?, notes = ? WHERE id = ?;', [event.name.trim(), event.date, event.notes || '', id]);
  }

  async deleteEvent(id) {
    const db = await this.getDB();
    await db.runAsync('DELETE FROM records WHERE event_id = ?;', [id]);
    await db.runAsync('DELETE FROM events WHERE id = ?;', [id]);
  }

  // --- Records ---
  async getAllRecords() {
    const db = await this.getDB();
    return await db.getAllAsync('SELECT r.*, e.name as event_name FROM records r LEFT JOIN events e ON r.event_id = e.id ORDER BY r.date DESC, r.id DESC;');
  }

  async getRecordsByEvent(eventId, filterType = 'all', sortBy = 'date_desc') {
    const db = await this.getDB();
    let query = `SELECT r.*, e.name as event_name FROM records r LEFT JOIN events e ON r.event_id = e.id WHERE r.event_id = ?`;
    if (filterType === 'given') query += ` AND r.type = 'given'`;
    else if (filterType === 'received') query += ` AND r.type = 'received'`;

    if (sortBy === 'amount_desc') query += ` ORDER BY r.amount DESC`;
    else if (sortBy === 'amount_asc') query += ` ORDER BY r.amount ASC`;
    else if (sortBy === 'name') query += ` ORDER BY r.person_name ASC`;
    else query += ` ORDER BY r.date DESC, r.id DESC`;

    return await db.getAllAsync(query, [eventId]);
  }

  async addRecord(record) {
    const db = await this.getDB();
    const result = await db.runAsync(
      `INSERT INTO records (event_id, person_name, amount, type, date, phone, address, relationship, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [record.event_id, record.person_name.trim(), record.amount, record.type, record.date, record.phone || '', record.address || '', record.relationship || '', record.notes || '']
    );
    return result.lastInsertRowId;
  }

  async updateRecord(id, record) {
    const db = await this.getDB();
    await db.runAsync(
      `UPDATE records SET person_name = ?, amount = ?, type = ?, date = ?, phone = ?, address = ?, relationship = ?, notes = ? WHERE id = ?;`,
      [record.person_name.trim(), record.amount, record.type, record.date, record.phone || '', record.address || '', record.relationship || '', record.notes || '', id]
    );
  }

  async deleteRecord(id) {
    const db = await this.getDB();
    await db.runAsync('DELETE FROM records WHERE id = ?;', [id]);
  }

  // --- Search (مع حل مشكلة التكرار) ---
  async searchPeople(query) {
    try {
      const db = await this.getDB();
      const searchTerm = `%${query.trim()}%`;
      // GROUP BY person_name يمنع تكرار نفس الشخص في نتائج البحث
      return await db.getAllAsync(`
        SELECT person_name, MAX(phone) as phone, MAX(address) as address, MAX(relationship) as relationship
        FROM records
        WHERE person_name LIKE ? OR phone LIKE ?
        GROUP BY person_name
        LIMIT 10;
      `, [searchTerm, searchTerm]);
    } catch (error) {
      return [];
    }
  }
}

export default new LocalDB();
