/* =====================================================
   QST — Dashboard View
   ===================================================== */

const Dashboard = (() => {
  let chartBar = null;
  let chartDoughnut = null;

  function render() {
    const el = document.getElementById('view-dashboard');
    const stats = App.certificates.getStats();
    const recentCerts = App.state.certificates.slice(0, 8);
    const expiringCerts = getExpiringSoon(30);

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Welcome back — here's your certificate activity overview</p>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline btn-sm" onclick="App.router.navigate('database')">
            <i class="fa-solid fa-database"></i> View All
          </button>
          <button class="btn btn-gold btn-sm" onclick="App.router.navigate('import')">
            <i class="fa-solid fa-plus"></i> New Batch
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        ${statCard('Total Certificates', stats.total, 'fa-certificate', 'gold', `+${stats.thisMonth} this month`, 'up')}
        ${statCard('Valid', stats.valid, 'fa-circle-check', 'green', 'Currently active', 'up')}
        ${statCard('Expiring Soon', expiringCerts.length, 'fa-clock', stats.total > 0 && expiringCerts.length > 0 ? 'red' : 'blue', 'Within 30 days', expiringCerts.length > 0 ? 'down' : 'up')}
        ${statCard('Revoked', stats.revoked, 'fa-ban', 'red', 'Total revoked', stats.revoked > 0 ? 'down' : 'up')}
        ${statCard('Templates', App.state.templates.length, 'fa-layer-group', 'blue', 'Available templates', 'up')}
        ${statCard('This Month', stats.thisMonth, 'fa-calendar-days', 'gold', 'Generated in ' + new Date().toLocaleString('en', { month: 'long' }), 'up')}
      </div>

      <!-- Charts Row -->
      <div class="grid-2" style="margin-bottom:20px;">
        <div class="chart-wrapper">
          <div class="chart-header">
            <span class="chart-title">Monthly Generation</span>
            <span style="font-size:12px;color:var(--text-muted);">Last 6 months</span>
          </div>
          <canvas id="chart-monthly" height="200"></canvas>
        </div>
        <div class="chart-wrapper">
          <div class="chart-header">
            <span class="chart-title">Certificate Status</span>
            <span style="font-size:12px;color:var(--text-muted);">All time</span>
          </div>
          <div style="display:flex;align-items:center;gap:20px;">
            <canvas id="chart-status" height="200" style="max-width:200px;"></canvas>
            <div id="chart-legend" style="flex:1;"></div>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Recent + Expiring -->
      <div class="grid-2">
        <!-- Recent Certificates -->
        <div class="table-wrapper">
          <div class="table-header">
            <span class="table-title">Recent Certificates</span>
            <button class="btn btn-ghost btn-sm" onclick="App.router.navigate('database')">View All</button>
          </div>
          ${recentCerts.length ? `
            <table>
              <thead><tr>
                <th>Cert No</th><th>Candidate</th><th>Course</th><th>Status</th>
              </tr></thead>
              <tbody>
                ${recentCerts.map(c => `
                  <tr style="cursor:pointer;" onclick="App.router.navigate('database')">
                    <td class="td-mono">${App.utils.escHtml(c.certificateNo || '—')}</td>
                    <td class="td-primary">${App.utils.escHtml(c.candidateName || '—')}</td>
                    <td>${App.utils.escHtml(c.courseName || '—')}</td>
                    <td>${statusBadge(c.status, c.validityDate)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : emptyState('fa-certificate', 'No certificates yet', 'Generate your first certificate to see it here.')}
        </div>

        <!-- Right column: expiring + quick actions -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <!-- Expiring Soon -->
          <div class="chart-wrapper" style="flex:1;">
            <div class="chart-header">
              <span class="chart-title">Expiring Soon</span>
              <span class="badge badge-warning">${expiringCerts.length}</span>
            </div>
            ${expiringCerts.length ? `
              <div style="display:flex;flex-direction:column;gap:8px;max-height:180px;overflow-y:auto;">
                ${expiringCerts.slice(0, 5).map(c => `
                  <div class="activity-item">
                    <div class="activity-dot" style="background:var(--warning);"></div>
                    <div>
                      <div class="activity-text"><strong>${App.utils.escHtml(c.candidateName)}</strong> — ${App.utils.escHtml(c.courseName)}</div>
                      <div class="activity-time">Expires: ${App.utils.formatDate(c.validityDate)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0;"><i class="fa-solid fa-circle-check" style="color:var(--success);font-size:28px;display:block;margin-bottom:8px;"></i>All certificates valid</div>`}
          </div>

          <!-- Quick Actions -->
          <div class="card-gold">
            <div class="chart-header" style="margin-bottom:12px;">
              <span class="chart-title">Quick Actions</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-gold" style="justify-content:flex-start;" onclick="App.router.navigate('import')">
                <i class="fa-solid fa-file-arrow-up"></i> Import Excel & Generate
              </button>
              <button class="btn btn-outline" style="justify-content:flex-start;" onclick="App.router.navigate('templates')">
                <i class="fa-solid fa-layer-group"></i> Manage Templates
              </button>
              <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="App.router.navigate('verify')">
                <i class="fa-solid fa-qrcode"></i> Verify Certificate
              </button>
              <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="exportReport()">
                <i class="fa-solid fa-file-excel"></i> Export Report (Excel)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Init charts after DOM is ready
    setTimeout(() => {
      initBarChart(stats);
      initDoughnutChart(stats);
    }, 50);
  }

  function statCard(label, value, icon, color, change, direction) {
    return `
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">${label}</span>
          <span class="stat-value">${value.toLocaleString()}</span>
          <span class="stat-change ${direction}">
            <i class="fa-solid fa-arrow-${direction === 'up' ? 'trend-up' : 'trend-down'}"></i>
            ${App.utils.escHtml(change)}
          </span>
        </div>
        <div class="stat-icon ${color}"><i class="fa-solid ${icon}"></i></div>
      </div>
    `;
  }

  function statusBadge(status, validityDate) {
    if (status === 'revoked') return '<span class="badge badge-error">Revoked</span>';
    if (validityDate && new Date(validityDate) < new Date()) return '<span class="badge badge-warning">Expired</span>';
    if (status === 'valid') return '<span class="badge badge-success">Valid</span>';
    return `<span class="badge badge-muted">${App.utils.escHtml(status || 'Unknown')}</span>`;
  }

  function emptyState(icon, title, text) {
    return `<div class="empty-state">
      <div class="empty-icon"><i class="fa-solid ${icon}"></i></div>
      <div class="empty-title">${title}</div>
      <div class="empty-text">${text}</div>
    </div>`;
  }

  function getExpiringSoon(days) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return App.state.certificates.filter(c => {
      if (c.status === 'revoked') return false;
      if (!c.validityDate) return false;
      const exp = new Date(c.validityDate);
      return exp >= now && exp <= cutoff;
    });
  }

  function getMonthlyData() {
    const months = [];
    const counts = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en', { month: 'short' });
      months.push(label);
      const count = App.state.certificates.filter(c => {
        const cd = new Date(c.createdAt);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      }).length;
      counts.push(count);
    }
    return { months, counts };
  }

  function initBarChart(stats) {
    const ctx = document.getElementById('chart-monthly');
    if (!ctx) return;
    if (chartBar) chartBar.destroy();
    const { months, counts } = getMonthlyData();
    chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Certificates',
          data: counts,
          backgroundColor: 'rgba(201,168,76,.35)',
          borderColor: '#C9A84C',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#7A9AB8', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#7A9AB8', font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
        },
      },
    });
  }

  function initDoughnutChart(stats) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;
    if (chartDoughnut) chartDoughnut.destroy();

    const data = [stats.valid || 0, stats.expired || 0, stats.revoked || 0];
    const total = data.reduce((a, b) => a + b, 0);

    chartDoughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Valid', 'Expired', 'Revoked'],
        datasets: [{
          data: total > 0 ? data : [1, 0, 0],
          backgroundColor: ['rgba(22,163,74,.7)', 'rgba(217,119,6,.7)', 'rgba(220,38,38,.7)'],
          borderColor: ['#16A34A', '#D97706', '#DC2626'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${total > 0 ? ctx.raw : 0}` } },
        },
      },
    });

    const legend = document.getElementById('chart-legend');
    if (legend) {
      const colors = ['#16A34A', '#D97706', '#DC2626'];
      const labels = ['Valid', 'Expired', 'Revoked'];
      legend.innerHTML = labels.map((l, i) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${colors[i]};flex-shrink:0;"></div>
          <span style="font-size:13px;color:var(--text-secondary);">${l}</span>
          <span style="margin-left:auto;font-size:13px;font-weight:600;color:var(--text-primary);">${total > 0 ? data[i] : 0}</span>
        </div>
      `).join('');
    }
  }

  function exportReport() {
    if (typeof XLSX === 'undefined') { App.notify.error('XLSX library not loaded'); return; }
    const data = App.state.certificates.map(c => ({
      'Certificate No': c.certificateNo || '',
      'Candidate Name': c.candidateName || '',
      'Course Name':    c.courseName || '',
      'Company':        c.companyName || '',
      'Issue Date':     App.utils.formatDate(c.issueDate),
      'Validity Date':  App.utils.formatDate(c.validityDate),
      'Status':         c.status || '',
      'Generated At':   App.utils.formatDateTime(c.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Certificates');
    XLSX.writeFile(wb, `QST_Certificate_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    App.notify.success('Report exported successfully');
  }

  // Expose exportReport globally for onclick
  window.exportReport = exportReport;

  return { render };
})();
