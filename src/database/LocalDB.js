import * as SQLite from 'expo-sqlite';

let db = null;

export const getDB = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('nuqoot_pro.db');
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      direction TEXT NOT NULL,
      location TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS nuqoot (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      person_name TEXT NOT NULL,
      amount REAL NOT NULL,
      phone TEXT DEFAULT '',
      relation TEXT DEFAULT '',
      address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    CREATE INDEX IF NOT EXISTS idx_nuqoot_event ON nuqoot(event_id);
    CREATE INDEX IF NOT EXISTS idx_nuqoot_person ON nuqoot(person_name);
  `);

  try { await db.execAsync("ALTER TABLE nuqoot ADD COLUMN address TEXT DEFAULT '';"); } catch (e) {}

  return db;
};

// ===== EVENTS =====
export const insertEvent = async (event) => {
  const d = await getDB();
  await d.runAsync(
    `INSERT INTO events (id, name, type, date, direction, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [event.id, event.name, event.type, event.date, event.direction, event.location || '', event.notes || '']
  );
};

export const getAllEvents = async () => {
  const d = await getDB();
  return await d.getAllAsync(`
    SELECT e.*, 
           COUNT(CASE WHEN n.is_deleted = 0 THEN 1 END) as nuqoot_count,
           COALESCE(SUM(CASE WHEN n.is_deleted = 0 THEN n.amount ELSE 0 END), 0) as total_amount
    FROM events e 
    LEFT JOIN nuqoot n ON e.id = n.event_id
    WHERE e.is_deleted = 0 
    GROUP BY e.id 
    ORDER BY e.date DESC, e.created_at DESC
  `);
};

export const getEventById = async (id) => {
  const d = await getDB();
  return await d.getFirstAsync(`
    SELECT e.*, 
           COUNT(CASE WHEN n.is_deleted = 0 THEN 1 END) as nuqoot_count,
           COALESCE(SUM(CASE WHEN n.is_deleted = 0 THEN n.amount ELSE 0 END), 0) as total_amount
    FROM events e 
    LEFT JOIN nuqoot n ON e.id = n.event_id
    WHERE e.id = ? AND e.is_deleted = 0 
    GROUP BY e.id
  `, [id]);
};

export const updateEvent = async (id, name, type, date, location, notes) => {
  const d = await getDB();
  await d.runAsync(
    `UPDATE events SET name=?, type=?, date=?, location=?, notes=? WHERE id=?`,
    [name, type, date, location || '', notes || '', id]
  );
};

export const softDeleteEvent = async (id) => {
  const d = await getDB();
  await d.runAsync(`UPDATE events SET is_deleted = 1 WHERE id = ?`, [id]);
  await d.runAsync(`UPDATE nuqoot SET is_deleted = 1 WHERE event_id = ?`, [id]);
};

// ===== NUQOOT =====
export const insertNuqoot = async (n) => {
  const d = await getDB();
  await d.runAsync(
    `INSERT INTO nuqoot (id, event_id, person_name, amount, phone, relation, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [n.id, n.event_id, n.person_name, n.amount, n.phone || '', n.relation || '', n.address || '', n.notes || '']
  );
};

export const getNuqootByEvent = async (eventId) => {
  const d = await getDB();
  return await d.getAllAsync(
    `SELECT * FROM nuqoot WHERE event_id = ? AND is_deleted = 0 ORDER BY amount DESC, created_at DESC`,
    [eventId]
  );
};

export const updateNuqoot = async (id, person_name, amount, phone, relation, address, notes) => {
  const d = await getDB();
  await d.runAsync(
    `UPDATE nuqoot SET person_name=?, amount=?, phone=?, relation=?, address=?, notes=? WHERE id=?`,
    [person_name, amount, phone || '', relation || '', address || '', notes || '', id]
  );
};

export const softDeleteNuqoot = async (id) => {
  const d = await getDB();
  await d.runAsync(`UPDATE nuqoot SET is_deleted = 1 WHERE id = ?`, [id]);
};

// ===== PEOPLE & SEARCH =====
export const getAllPeople = async () => {
  const d = await getDB();
  return await d.getAllAsync(`
    SELECT 
      n.person_name, 
      MAX(n.phone) as phone,
      MAX(n.relation) as relation,
      MAX(n.address) as address,
      SUM(CASE WHEN e.direction = 'incoming' AND n.is_deleted = 0 AND e.is_deleted = 0 THEN n.amount ELSE 0 END) as total_received,
      SUM(CASE WHEN e.direction = 'outgoing' AND n.is_deleted = 0 AND e.is_deleted = 0 THEN n.amount ELSE 0 END) as total_given,
      COUNT(CASE WHEN n.is_deleted = 0 AND e.is_deleted = 0 THEN 1 END) as total_events
    FROM nuqoot n 
    JOIN events e ON n.event_id = e.id
    WHERE n.is_deleted = 0 AND e.is_deleted = 0
    GROUP BY n.person_name 
    ORDER BY n.person_name
  `);
};

export const searchPeople = async (query) => {
  const d = await getDB();
  return await d.getAllAsync(`
    SELECT 
      n.person_name, 
      MAX(n.phone) as phone,
      MAX(n.address) as address,
      SUM(CASE WHEN e.direction = 'incoming' THEN n.amount ELSE 0 END) as total_received,
      SUM(CASE WHEN e.direction = 'outgoing' THEN n.amount ELSE 0 END) as total_given,
      COUNT(*) as total_events
    FROM nuqoot n 
    JOIN events e ON n.event_id = e.id
    WHERE (n.person_name LIKE ? OR n.phone LIKE ?) AND n.is_deleted = 0 AND e.is_deleted = 0
    GROUP BY n.person_name 
    ORDER BY n.person_name
  `, [`%${query}%`, `%${query}%`]);
};

export const getPersonHistory = async (name) => {
  const d = await getDB();
  return await d.getAllAsync(`
    SELECT n.*, e.name as event_name, e.type as event_type, e.direction, e.date as event_date
    FROM nuqoot n 
    JOIN events e ON n.event_id = e.id
    WHERE n.person_name = ? AND n.is_deleted = 0 AND e.is_deleted = 0
    ORDER BY e.date DESC
  `, [name]);
};

// ===== STATS & BACKUP =====
export const getGeneralStats = async () => {
  const d = await getDB();
  const inc = await d.getFirstAsync(`SELECT COALESCE(SUM(n.amount), 0) as t FROM nuqoot n JOIN events e ON n.event_id = e.id WHERE e.direction = 'incoming' AND n.is_deleted = 0 AND e.is_deleted = 0`);
  const out = await d.getFirstAsync(`SELECT COALESCE(SUM(n.amount), 0) as t FROM nuqoot n JOIN events e ON n.event_id = e.id WHERE e.direction = 'outgoing' AND n.is_deleted = 0 AND e.is_deleted = 0`);
  const ev = await d.getFirstAsync(`SELECT COUNT(*) as c FROM events WHERE is_deleted = 0`);
  const pp = await d.getFirstAsync(`SELECT COUNT(DISTINCT person_name) as c FROM nuqoot WHERE is_deleted = 0`);
  return { totalIncoming: inc?.t || 0, totalOutgoing: out?.t || 0, balance: (inc?.t || 0) - (out?.t || 0), eventCount: ev?.c || 0, peopleCount: pp?.c || 0 };
};

export const getTopPeople = async (direction, limit = 10) => {
  const d = await getDB();
  return await d.getAllAsync(`
    SELECT n.person_name, SUM(n.amount) as total_amount, COUNT(*) as times
    FROM nuqoot n JOIN events e ON n.event_id = e.id
    WHERE e.direction = ? AND n.is_deleted = 0 AND e.is_deleted = 0
    GROUP BY n.person_name ORDER BY total_amount DESC LIMIT ?
  `, [direction, limit]);
};

export const getFullBackup = async () => {
  const d = await getDB();
  const events = await d.getAllAsync('SELECT * FROM events WHERE is_deleted = 0');
  const nuqoot = await d.getAllAsync('SELECT * FROM nuqoot WHERE is_deleted = 0');
  return { events, nuqoot, exportDate: new Date().toISOString(), version: '2.0' };
};

export const restoreFromBackup = async (data) => {
  const d = await getDB();
  await d.runAsync('DELETE FROM nuqoot');
  await d.runAsync('DELETE FROM events');
  for (const e of data.events) {
    await d.runAsync(
      `INSERT OR REPLACE INTO events (id, name, type, date, direction, location, notes, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [e.id, e.name, e.type, e.date, e.direction, e.location || '', e.notes || '', e.created_at || new Date().toISOString()]
    );
  }
  for (const n of data.nuqoot) {
    await d.runAsync(
      `INSERT OR REPLACE INTO nuqoot (id, event_id, person_name, amount, phone, relation, address, notes, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [n.id, n.event_id, n.person_name, n.amount, n.phone || '', n.relation || '', n.address || '', n.notes || '', n.created_at || new Date().toISOString()]
    );
  }
};
