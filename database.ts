 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/database.ts b/database.ts
index 86b4d3697e61c4806cd1b192beeb3fc206448155..aa50f433d128faa2058f6bcab6fa4901f058bf80 100644
+++ b/database.ts
@@ -1,28 +1,39 @@
 import Database from 'better-sqlite3';
+import fs from 'fs';
+import path from 'path';
+import { fileURLToPath } from 'url';
 
+const __filename = fileURLToPath(import.meta.url);
+const __dirname = path.dirname(__filename);
+const dataDir = path.join(__dirname, 'data');
+
+if (!fs.existsSync(dataDir)) {
+  fs.mkdirSync(dataDir, { recursive: true });
+}
+
+const db = new Database(path.join(dataDir, 'database.sqlite'));
 
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
 
EOF
)
