const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const beneficiaryCount = db.get('SELECT COUNT(*) AS count FROM beneficiaries');
  const programCount = db.get('SELECT COUNT(*) AS count FROM programs');
  const donorCount = db.get('SELECT COUNT(*) AS count FROM donors');
  const donationTotal = db.get('SELECT COALESCE(SUM(amount), 0) AS total FROM donations');
  const districtCount = db.get('SELECT COUNT(*) AS count FROM districts');
  const volunteerTotal = db.get('SELECT COALESCE(SUM(volunteer_count), 0) AS total FROM districts');
  const activeBeneficiaries = db.get("SELECT COUNT(*) AS count FROM beneficiaries WHERE status = 'active'");
  const programs = db.all('SELECT * FROM programs ORDER BY created_at DESC');
  const recentDonations = db.all('SELECT dn.*, p.name AS program_name FROM donations dn LEFT JOIN programs p ON dn.program_id = p.id ORDER BY dn.created_at DESC LIMIT 5');
  const recentReports = db.all('SELECT r.*, p.name AS program_name FROM field_reports r LEFT JOIN programs p ON r.program_id = p.id ORDER BY r.submitted_at DESC LIMIT 5');
  const openCases = db.all("SELECT COUNT(*) AS count FROM field_reports WHERE status = 'flag'");

  // Monthly donations for chart (last 8 months)
  const monthlyDonations = db.all(`
    SELECT strftime('%Y-%m', created_at) AS month,
           COALESCE(SUM(amount), 0) AS total
    FROM donations
    WHERE created_at >= date('now', '-8 months')
    GROUP BY month ORDER BY month
  `);

  // Donations by program
  const donationsByProgram = db.all(`
    SELECT COALESCE(p.name, 'Unallocated') AS program,
           COALESCE(SUM(dn.amount), 0) AS total
    FROM donations dn LEFT JOIN programs p ON dn.program_id = p.id
    GROUP BY dn.program_id ORDER BY total DESC
  `);

  // Beneficiaries by program
  const beneficiariesByProgram = db.all(`
    SELECT p.name AS program, COUNT(b.id) AS count
    FROM beneficiaries b JOIN programs p ON b.program_id = p.id
    GROUP BY b.program_id ORDER BY count DESC
  `);

  // New feature stats
  const expenseTotal = db.get('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses');
  const activeVolunteers = db.get("SELECT COUNT(*) AS count FROM volunteers WHERE status = 'active'");
  const pendingTasks = db.get("SELECT COUNT(*) AS count FROM tasks WHERE status != 'completed'");
  const recentAnnouncements = db.all('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 3');
  const upcomingTasks = db.all("SELECT t.*, p.name AS program_name FROM tasks t LEFT JOIN programs p ON t.program_id = p.id WHERE t.status != 'completed' ORDER BY t.due_date ASC LIMIT 5");
  const recentExpenses = db.all('SELECT e.*, p.name AS program_name FROM expenses e LEFT JOIN programs p ON e.program_id = p.id ORDER BY e.expense_date DESC LIMIT 5');

  res.json({
    stats: {
      beneficiaries: beneficiaryCount.count,
      active_beneficiaries: activeBeneficiaries.count,
      programs: programCount.count,
      donors: donorCount.count,
      funds_raised: donationTotal.total,
      districts: districtCount.count,
      volunteers: volunteerTotal.total,
      open_cases: openCases[0]?.count || 0,
      total_expenses: expenseTotal.total,
      active_volunteers: activeVolunteers.count,
      pending_tasks: pendingTasks.count
    },
    programs,
    monthly_donations: monthlyDonations,
    donations_by_program: donationsByProgram,
    beneficiaries_by_program: beneficiariesByProgram,
    recent_donations: recentDonations,
    recent_reports: recentReports,
    recent_announcements: recentAnnouncements,
    upcoming_tasks: upcomingTasks,
    recent_expenses: recentExpenses
  });
});

module.exports = router;
