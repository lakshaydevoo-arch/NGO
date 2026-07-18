async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

function getDashboard() { return api('GET', '/api/dashboard'); }
function getPrograms() { return api('GET', '/api/programs'); }
function getProgram(id) { return api('GET', `/api/programs/${id}`); }
function createProgram(data) { return api('POST', '/api/programs', data); }
function updateProgram(id, data) { return api('PUT', `/api/programs/${id}`, data); }
function deleteProgram(id) { return api('DELETE', `/api/programs/${id}`); }

function getBeneficiaries(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api('GET', '/api/beneficiaries' + q);
}
function getBeneficiary(id) { return api('GET', `/api/beneficiaries/${id}`); }
function createBeneficiary(data) { return api('POST', '/api/beneficiaries', data); }
function updateBeneficiary(id, data) { return api('PUT', `/api/beneficiaries/${id}`, data); }
function deleteBeneficiary(id) { return api('DELETE', `/api/beneficiaries/${id}`); }

function getDonors() { return api('GET', '/api/donors'); }
function getDonor(id) { return api('GET', `/api/donors/${id}`); }
function createDonor(data) { return api('POST', '/api/donors', data); }
function updateDonor(id, data) { return api('PUT', `/api/donors/${id}`, data); }
function deleteDonor(id) { return api('DELETE', `/api/donors/${id}`); }

function getDonations(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api('GET', '/api/donations' + q);
}
function createDonation(data) { return api('POST', '/api/donations', data); }
function deleteDonation(id) { return api('DELETE', `/api/donations/${id}`); }

function getReports(params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api('GET', '/api/reports' + q);
}
function createReport(data) { return api('POST', '/api/reports', data); }
function updateReport(id, data) { return api('PUT', `/api/reports/${id}`, data); }
function deleteReport(id) { return api('DELETE', `/api/reports/${id}`); }
