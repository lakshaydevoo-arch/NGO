window.orgSettings = {
  currency: '₹',
  name: 'Sammriddhi Trust',
  tagline: 'Foundation',
  region: 'UTTAR PRADESH REGION',
  district_count: '14',
  volunteer_count: '62'
};

window.orgSettingsPromise = (async () => {
  try {
    const res = await api('GET', '/api/settings');
    res.settings.forEach(s => {
      window.orgSettings[s.key] = s.value;
    });
    return window.orgSettings;
  } catch (e) {
    console.error('Error fetching settings in org-loader.js:', e);
    return window.orgSettings;
  }
})();

window.formatCurrency = function(val) {
  const symbol = window.orgSettings.currency || '₹';
  return symbol + Number(val).toLocaleString('en-IN');
};

async function loadOrgSettings() {
  const settings = await window.orgSettingsPromise;

  // Update brand name in sidebar
  const brandNameEl = document.querySelector('.brand-name');
  if (brandNameEl) {
    const name = settings.name || 'Sammriddhi Trust';
    const tagline = settings.tagline || 'Foundation';
    brandNameEl.innerHTML = `${name}<span>${tagline}</span>`;
  }

  // Update region name and stats in sidebar footer
  const footerEl = document.querySelector('.sidebar-footer');
  if (footerEl) {
    const region = settings.region || 'UTTAR PRADESH REGION';
    const dists = settings.district_count || '14';
    const vols = settings.volunteer_count || '62';
    
    footerEl.innerHTML = `
      <strong>${region}</strong>
      ${dists} districts &middot; ${vols} field volunteers
      <button type="button" id="logoutBtn" class="logout-btn">Log out</button>
    `;

    // Re-attach event listener
    const newLogoutBtn = document.getElementById('logoutBtn');
    if (newLogoutBtn) {
      newLogoutBtn.addEventListener('click', async () => {
        await logout();
        window.location.href = '/login.html';
      });
    }
  }

  // Update document title
  const pageTitleEl = document.querySelector('title');
  if (pageTitleEl && settings.name) {
    pageTitleEl.textContent = pageTitleEl.textContent.replace('Sammriddhi Trust', settings.name);
  }

  // Update all currency-symbol elements
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = settings.currency || '₹';
  });
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
  loadOrgSettings();
});
