import * as SQLite from 'expo-sqlite';

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('nuqoot_pro.db');
      await this.setupTables();
    }
    return this.db;
  }

  async setupTables() {
    await this.db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        budget REAL DEFAULT 0,
        icon TEXT DEFAULT 'gift',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        person_name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT CHECK(type IN ('give', 'receive')) NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  async getAllAsync(query, params = []) {
    await this.init();
    return await this.db.getAllAsync(query, params);
  }

  async getFirstAsync(query, params = []) {
    await this.init();
    return await this.db.getFirstAsync(query, params);
  }

  async runAsync(query, params = []) {
    await this.init();
    return await this.db.runAsync(query, params);
  }

  async withTransactionAsync(action) {
    await this.init();
    return await this.db.withTransactionAsync(action);
  }
}

const db = new Database();
export default db;
