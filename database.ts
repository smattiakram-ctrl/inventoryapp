import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'database.sqlite'));

db.pragma('journal_mode = WAL');

const initDB = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      picture TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      image TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      name TEXT,
      wholesale_price REAL,
      retail_price REAL,
      quantity INTEGER DEFAULT 0,
      barcode TEXT,
      image TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS loyal_customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      address TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT,
      selling_price REAL,
      date TEXT,
      customer_id TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      quantity INTEGER DEFAULT 1,
      created_at INTEGER
    );
  `);
};

initDB();

export default db;
