const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'ngo.db');

let db = null;

function getDb() {
  if (db) return db;
  throw new Error('Database not initialized. Call initDb() first.');
}

async function initDb() {
  const fs = require('fs');
  const path = require('path');
  const SQL = await initSqlJs();

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT DEFAULT (datetime(\'now\')))');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

  db.run(`CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    villages INTEGER DEFAULT 0,
    district TEXT,
    progress_pct REAL DEFAULT 0,
    stage TEXT DEFAULT 'Sown',
    target_amount REAL DEFAULT 0,
    raised_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS beneficiaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    village TEXT,
    district TEXT,
    program_id INTEGER,
    contact TEXT,
    enrolled_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'active',
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS donors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    type TEXT DEFAULT 'individual',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id INTEGER,
    program_id INTEGER,
    donor_name TEXT,
    amount REAL NOT NULL,
    type TEXT DEFAULT 'one-time',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (donor_id) REFERENCES donors(id),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS field_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_name TEXT NOT NULL,
    district TEXT,
    village TEXT,
    program_id INTEGER,
    summary TEXT NOT NULL,
    status TEXT DEFAULT 'ok',
    submitted_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS districts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    volunteer_count INTEGER DEFAULT 0
  )`);

  // Seed data if empty
  const programCount = db.exec('SELECT COUNT(*) AS cnt FROM programs');
  if (!programCount.length || !programCount[0].values[0][0]) {
    db.run("INSERT INTO programs (name, description, villages, district, progress_pct, stage, target_amount, raised_amount) VALUES ('Clean Water Access', 'Borewell and water purification installations', 18, 'Bulandshahr', 82, 'Harvested', 1500000, 1230000)");
    db.run("INSERT INTO programs (name, description, villages, district, progress_pct, stage, target_amount, raised_amount) VALUES ('Girls'' Primary Education', 'Enrollment and retention of girls in primary schools', 32, 'Meerut', 58, 'Growing', 2500000, 1450000)");
    db.run("INSERT INTO programs (name, description, villages, district, progress_pct, stage, target_amount, raised_amount) VALUES ('Mobile Health Camps', 'Weekly mobile clinics serving remote villages', 21, 'Hapur', 35, 'Sprouting', 1800000, 630000)");
    db.run("INSERT INTO programs (name, description, villages, district, progress_pct, stage, target_amount, raised_amount) VALUES ('Farmer Skilling Cohort', 'Training farmers in sustainable practices', 15, 'Ghaziabad', 12, 'Sown', 900000, 108000)");

    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Bulandshahr', 12)");
    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Meerut', 15)");
    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Hapur', 8)");
    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Ghaziabad', 10)");
    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Saharanpur', 6)");
    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Muzaffarnagar', 5)");
    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Bagpat', 3)");
    db.run("INSERT INTO districts (name, volunteer_count) VALUES ('Shamli', 3)");

    db.run("INSERT INTO donors (name, email, type, notes) VALUES ('Meera Agarwal', 'meera.a@gmail.com', 'individual', 'Monthly recurring donor')");
    db.run("INSERT INTO donors (name, email, type, notes) VALUES ('TCS Foundation', NULL, 'corporate', 'CSR grant partner')");
    db.run("INSERT INTO donors (name, email, type, notes) VALUES ('Vikram Nair', 'vik.nair@outlook.com', 'individual', 'Supports health programs')");
    db.run("INSERT INTO donors (name, email, type, notes) VALUES ('Sunita Devi Trust', NULL, 'trust', 'Local philanthropy')");

    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type) VALUES (1, 1, 'Meera Agarwal', 5000, 'recurring')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type) VALUES (2, 2, 'TCS Foundation', 320000, 'one-time')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type) VALUES (3, 3, 'Vikram Nair', 2500, 'recurring')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type) VALUES (NULL, 1, 'Anonymous', 150000, 'one-time')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type) VALUES (4, 4, 'Sunita Devi Trust', 75000, 'one-time')");

    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status) VALUES ('Ramesh K.', 'Bulandshahr', 'Aurangabad', 1, 'Logged 3 new borewell installations in Bulandshahr block', 'ok')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status) VALUES ('Priya S.', 'Meerut', 'Kurali', 2, 'Closed enrollment for 40 students, Meerut cohort', 'ok')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status) VALUES ('Anil K.', 'Hapur', 'Bhojpur', 3, 'Health camp flagged low turnout — needs follow-up', 'flag')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status) VALUES ('Anonymous', 'Bulandshahr', NULL, 1, 'Contributed ₹1,50,000 toward water program', 'ok')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status) VALUES ('Field Team Ghaziabad', 'Ghaziabad', 'Dasna', 4, 'Submitted quarterly impact survey', 'ok')");
  }

  saveDb();
  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function prepare(sql) {
  return getDb().prepare(sql);
}

function run(sql, params) {
  const result = getDb().run(sql, params);
  saveDb();
  return result;
}

function get(sql, params) {
  const stmt = prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all(sql, params) {
  const stmt = prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { initDb, getDb, prepare, run, get, all, saveDb };
