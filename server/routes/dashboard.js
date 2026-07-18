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

  res.json({
    stats: {
      beneficiaries: beneficiaryCount.count,
      active_beneficiaries: activeBeneficiaries.count,
      programs: programCount.count,
      donors: donorCount.count,
      funds_raised: donationTotal.total,
      districts: districtCount.count,
      volunteers: volunteerTotal.total,
      open_cases: openCases[0]?.count || 0
    },
    programs,
    recent_donations: recentDonations,
    recent_reports: recentReports
  });
});

module.exports = router;
