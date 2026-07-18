const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { initDb } = require('./db');
const authRouter = require('./routes/auth');
const programsRouter = require('./routes/programs');
const beneficiariesRouter = require('./routes/beneficiaries');
const donorsRouter = require('./routes/donors');
const donationsRouter = require('./routes/donations');
const reportsRouter = require('./routes/reports');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'sammriddhi-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRouter);
app.use('/api/programs', programsRouter);
app.use('/api/beneficiaries', beneficiariesRouter);
app.use('/api/donors', donorsRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
