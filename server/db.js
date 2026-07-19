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

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER,
    category TEXT DEFAULT 'Other',
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    district TEXT,
    program_id INTEGER,
    hours_committed REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS volunteer_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteer_id INTEGER NOT NULL,
    program_id INTEGER,
    hours REAL NOT NULL,
    description TEXT,
    logged_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    program_id INTEGER,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    priority TEXT DEFAULT 'normal',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS organization_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    program_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    beneficiary_id INTEGER,
    volunteer_id INTEGER,
    quantity_distributed INTEGER,
    distributed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (item_id) REFERENCES inventory(id),
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_date TEXT,
    program_id INTEGER,
    volunteer_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES programs(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS impact_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER,
    metric_name TEXT NOT NULL,
    target_value REAL,
    achieved_value REAL,
    unit TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES programs(id)
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

    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (1, 1, 'Meera Agarwal', 45000, 'recurring', '2026-01-15')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (1, 1, 'Meera Agarwal', 5000, 'recurring', '2026-02-15')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (1, 1, 'Meera Agarwal', 5000, 'recurring', '2026-03-15')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (1, 1, 'Meera Agarwal', 5000, 'recurring', '2026-04-15')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (1, 1, 'Meera Agarwal', 5000, 'recurring', '2026-05-15')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (1, 1, 'Meera Agarwal', 5000, 'recurring', '2026-06-15')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (3, 3, 'Vikram Nair', 2500, 'recurring', '2026-03-10')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (3, 3, 'Vikram Nair', 2500, 'recurring', '2026-04-10')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (3, 3, 'Vikram Nair', 2500, 'recurring', '2026-05-10')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (2, 2, 'TCS Foundation', 320000, 'one-time', '2026-06-20')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (NULL, 1, 'Anonymous', 150000, 'one-time', '2026-06-25')");
    db.run("INSERT INTO donations (donor_id, program_id, donor_name, amount, type, created_at) VALUES (4, 4, 'Sunita Devi Trust', 75000, 'one-time', '2026-04-05')");

    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status, submitted_at) VALUES ('Ramesh K.', 'Bulandshahr', 'Aurangabad', 1, 'Logged 3 new borewell installations in Bulandshahr block', 'ok', '2026-07-18 09:30:00')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status, submitted_at) VALUES ('Priya S.', 'Meerut', 'Kurali', 2, 'Closed enrollment for 40 students, Meerut cohort', 'ok', '2026-07-17 14:15:00')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status, submitted_at) VALUES ('Anil K.', 'Hapur', 'Bhojpur', 3, 'Health camp flagged low turnout — needs follow-up', 'flag', '2026-07-16 11:00:00')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status, submitted_at) VALUES ('Anonymous', 'Bulandshahr', NULL, 1, 'Contributed ₹1,50,000 toward water program', 'ok', '2026-07-14 18:40:00')");
    db.run("INSERT INTO field_reports (author_name, district, village, program_id, summary, status, submitted_at) VALUES ('Field Team Ghaziabad', 'Ghaziabad', 'Dasna', 4, 'Submitted quarterly impact survey', 'ok', '2026-07-12 11:05:00')");

    db.run("INSERT INTO beneficiaries (name, age, gender, village, district, program_id, contact, status) VALUES ('Sunita Devi', 34, 'Female', 'Aurangabad', 'Bulandshahr', 1, '9876543210', 'active')");
    db.run("INSERT INTO beneficiaries (name, age, gender, village, district, program_id, contact, status) VALUES ('Ram Pal', 42, 'Male', 'Kurali', 'Meerut', 2, '9876543211', 'active')");
    db.run("INSERT INTO beneficiaries (name, age, gender, village, district, program_id, contact, status) VALUES ('Geeta Singh', 28, 'Female', 'Bhojpur', 'Hapur', 3, '9876543212', 'active')");
    db.run("INSERT INTO beneficiaries (name, age, gender, village, district, program_id, contact, status) VALUES ('Mohan Lal', 55, 'Male', 'Dasna', 'Ghaziabad', 4, '9876543213', 'graduated')");
    db.run("INSERT INTO beneficiaries (name, age, gender, village, district, program_id, contact, status) VALUES ('Asha Devi', 30, 'Female', 'Aurangabad', 'Bulandshahr', 1, '9876543214', 'active')");

    // Seed expenses
    db.run("INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (1, 'Materials', 'Borewell pipes and pumps', 85000, '2026-06-10')");
    db.run("INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (1, 'Labour', 'Installation crew wages', 32000, '2026-06-15')");
    db.run("INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (2, 'Supplies', 'School books and stationery', 18000, '2026-05-20')");
    db.run("INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (2, 'Salary', 'Teacher honorarium', 25000, '2026-06-01')");
    db.run("INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (3, 'Medical', 'Vaccines and medicines', 42000, '2026-06-18')");
    db.run("INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (4, 'Training', 'Farmer workshop materials', 15000, '2026-05-05')");
    db.run("INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (NULL, 'Admin', 'Office rent and utilities', 35000, '2026-06-01')");

    // Seed volunteers
    db.run("INSERT INTO volunteers (name, email, phone, district, program_id, hours_committed, status) VALUES ('Ramesh Kumar', 'ramesh.k@email.com', '9876500001', 'Bulandshahr', 1, 40, 'active')");
    db.run("INSERT INTO volunteers (name, email, phone, district, program_id, hours_committed, status) VALUES ('Priya Sharma', 'priya.s@email.com', '9876500002', 'Meerut', 2, 30, 'active')");
    db.run("INSERT INTO volunteers (name, email, phone, district, program_id, hours_committed, status) VALUES ('Anil Yadav', 'anil.y@email.com', '9876500003', 'Hapur', 3, 25, 'active')");
    db.run("INSERT INTO volunteers (name, email, phone, district, program_id, hours_committed, status) VALUES ('Sunita Verma', 'sunita.v@email.com', '9876500004', 'Ghaziabad', 4, 20, 'active')");
    db.run("INSERT INTO volunteers (name, email, phone, district, program_id, hours_committed, status) VALUES ('Vijay Singh', 'vijay.s@email.com', '9876500005', 'Bulandshahr', NULL, 15, 'inactive')");

    // Seed volunteer hours
    db.run("INSERT INTO volunteer_hours (volunteer_id, program_id, hours, description, logged_date) VALUES (1, 1, 8, 'Borewell installation day 1', '2026-06-10')");
    db.run("INSERT INTO volunteer_hours (volunteer_id, program_id, hours, description, logged_date) VALUES (1, 1, 8, 'Borewell installation day 2', '2026-06-11')");
    db.run("INSERT INTO volunteer_hours (volunteer_id, program_id, hours, description, logged_date) VALUES (2, 2, 4, 'School visit and enrollment', '2026-06-05')");
    db.run("INSERT INTO volunteer_hours (volunteer_id, program_id, hours, description, logged_date) VALUES (3, 3, 6, 'Health camp setup and registration', '2026-06-18')");

    // Seed tasks
    db.run("INSERT INTO tasks (title, description, assigned_to, program_id, priority, status, due_date) VALUES ('Order borewell pumps', 'Purchase 5 submersible pumps for upcoming installations', 'Ramesh Kumar', 1, 'high', 'in_progress', '2026-07-25')");
    db.run("INSERT INTO tasks (title, description, assigned_to, program_id, priority, status, due_date) VALUES ('Enroll 20 new students', 'Visit 5 villages and enroll girls for next cohort', 'Priya Sharma', 2, 'high', 'pending', '2026-08-01')");
    db.run("INSERT INTO tasks (title, description, assigned_to, program_id, priority, status, due_date) VALUES ('Health camp supplies', 'Stock medicines and vaccines for July camps', 'Anil Yadav', 3, 'medium', 'pending', '2026-07-28')");
    db.run("INSERT INTO tasks (title, description, assigned_to, program_id, priority, status, due_date) VALUES ('Quarterly report', 'Compile impact metrics for board meeting', 'Admin', NULL, 'medium', 'in_progress', '2026-07-31')");
    db.run("INSERT INTO tasks (title, description, assigned_to, program_id, priority, status, due_date) VALUES ('Volunteer training', 'Conduct orientation for 5 new volunteers', 'Admin', NULL, 'low', 'pending', '2026-08-10')");

    // Seed announcements
    db.run("INSERT INTO announcements (title, content, author, priority) VALUES ('Welcome to Sammriddhi Trust', 'Welcome to the new dashboard! All team members can now track programs, beneficiaries, donors, and field activities in real time.', 'Admin', 'high')");
    db.run("INSERT INTO announcements (title, content, author, priority) VALUES ('Field vehicle maintenance', 'All field vehicles must undergo quarterly maintenance by July 30. Please coordinate with the admin team.', 'Operations', 'normal')");
    db.run("INSERT INTO announcements (title, content, author, priority) VALUES ('New funding milestone', 'We have crossed ₹5L in recurring donations this quarter. Thank you to the fundraising team!', 'Admin', 'normal')");
  }

  // Seed settings if empty
  const settingsCount = db.exec("SELECT COUNT(*) AS cnt FROM organization_settings");
  if (!settingsCount.length || !settingsCount[0].values[0][0]) {
    db.run("INSERT INTO organization_settings (key, value) VALUES ('name', 'Sammriddhi Trust')");
    db.run("INSERT INTO organization_settings (key, value) VALUES ('tagline', 'Foundation')");
    db.run("INSERT INTO organization_settings (key, value) VALUES ('region', 'UTTAR PRADESH REGION')");
    db.run("INSERT INTO organization_settings (key, value) VALUES ('district_count', '14')");
    db.run("INSERT INTO organization_settings (key, value) VALUES ('volunteer_count', '62')");
    db.run("INSERT INTO organization_settings (key, value) VALUES ('currency', '₹')");
  }

  // Seed inventory and distributions if empty
  const inventoryCount = db.exec("SELECT COUNT(*) AS cnt FROM inventory");
  if (!inventoryCount.length || !inventoryCount[0].values[0][0]) {
    db.run("INSERT INTO inventory (item_name, quantity, unit, program_id) VALUES ('Water Purifiers', 50, 'units', 1)");
    db.run("INSERT INTO inventory (item_name, quantity, unit, program_id) VALUES ('Textbooks Set', 250, 'packs', 2)");
    db.run("INSERT INTO inventory (item_name, quantity, unit, program_id) VALUES ('First Aid Kits', 80, 'kits', 3)");
    db.run("INSERT INTO inventory (item_name, quantity, unit, program_id) VALUES ('Seed Bags', 120, 'bags', 4)");
    
    db.run("INSERT INTO distributions (item_id, beneficiary_id, volunteer_id, quantity_distributed) VALUES (1, 1, 1, 1)");
    db.run("INSERT INTO distributions (item_id, beneficiary_id, volunteer_id, quantity_distributed) VALUES (2, 2, 2, 2)");
  }

  // Seed events if empty
  const eventsCount = db.exec("SELECT COUNT(*) AS cnt FROM events");
  if (!eventsCount.length || !eventsCount[0].values[0][0]) {
    db.run("INSERT INTO events (title, description, location, event_date, program_id, volunteer_count) VALUES ('Clean Water Awareness Drive', 'Educate villagers about hygiene and water purification', 'Aurangabad Village', '2026-07-28', 1, 5)");
    db.run("INSERT INTO events (title, description, location, event_date, program_id, volunteer_count) VALUES ('Primary School Enrollment Camp', 'Door-to-door drive to enroll girls in school', 'Kurali Block', '2026-08-05', 2, 8)");
    db.run("INSERT INTO events (title, description, location, event_date, program_id, volunteer_count) VALUES ('Mobile Health Camp - Hapur', 'Free checkup and medicine distribution camp', 'Bhojpur', '2026-08-12', 3, 4)");
  }

  // Seed impact milestones if empty
  const impactCount = db.exec("SELECT COUNT(*) AS cnt FROM impact_milestones");
  if (!impactCount.length || !impactCount[0].values[0][0]) {
    db.run("INSERT INTO impact_milestones (program_id, metric_name, target_value, achieved_value, unit) VALUES (1, 'Borewells Installed', 20, 15, 'wells')");
    db.run("INSERT INTO impact_milestones (program_id, metric_name, target_value, achieved_value, unit) VALUES (1, 'People Served with Clean Water', 5000, 4100, 'people')");
    db.run("INSERT INTO impact_milestones (program_id, metric_name, target_value, achieved_value, unit) VALUES (2, 'Girls Enrolled in School', 200, 154, 'girls')");
    db.run("INSERT INTO impact_milestones (program_id, metric_name, target_value, achieved_value, unit) VALUES (3, 'Patients Treated in Health Camps', 1500, 820, 'patients')");
    db.run("INSERT INTO impact_milestones (program_id, metric_name, target_value, achieved_value, unit) VALUES (4, 'Farmers Trained in Organic Farming', 100, 45, 'farmers')");
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
