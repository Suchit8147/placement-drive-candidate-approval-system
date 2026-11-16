/**
 * Admin Console JavaScript Controller
 * Connects all 11 database tables to live REST APIs (GET, POST, PUT, DELETE)
 */

let allCompanies = [];
let allDrives = [];
let allRooms = [];
let allInterviewers = [];
let allApplications = [];
let allUsers = [];

// ==========================================
// Tab Switching
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  const targetPane = document.getElementById('tab-' + tabId);
  if (targetPane) targetPane.classList.add('active');

  // Highlight button
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)) {
      btn.classList.add('active');
    }
  });

  // Lazy-load tab data
  if (tabId === 'students') loadStudents();
  if (tabId === 'companies') loadCompanies();
  if (tabId === 'drives') loadDrives();
  if (tabId === 'applications') loadApplications();
  if (tabId === 'interviews') { loadSchedules(); loadInterviewers(); loadRounds(); }
  if (tabId === 'rooms') loadRooms();
  if (tabId === 'results') loadResults();
  if (tabId === 'notifications') loadNotifications();
  if (tabId === 'overview') loadOverview();
}

// ==========================================
// Modal Helpers
// ==========================================
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

// Close modal when clicking on backdrop
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

// ==========================================
// System Overview & Diagnostics
// ==========================================
async function loadOverview() {
  try {
    const res = await fetch('/api/placement/overview');
    const json = await res.json();
    if (!json.success) return;

    const stats = json.stats;
    document.getElementById('stat-drives').innerText = stats.activeDrives;
    document.getElementById('stat-apps').innerText = stats.totalApplications;
    document.getElementById('stat-rooms').innerText = stats.provisionedRooms;
    document.getElementById('stat-slots').innerText = stats.scheduledSlots;
    document.getElementById('stat-students').innerText = stats.totalStudents;
    document.getElementById('stat-companies').innerText = stats.totalCompanies;
    document.getElementById('stat-results').innerText = stats.totalResults;
    document.getElementById('stat-notifs').innerText = stats.unreadNotifications;

    // Badges in tabs
    document.getElementById('tab-cnt-students').innerText = stats.totalStudents;
    document.getElementById('tab-cnt-companies').innerText = stats.totalCompanies;
    document.getElementById('tab-cnt-drives').innerText = stats.activeDrives;
    document.getElementById('tab-cnt-apps').innerText = stats.totalApplications;
    document.getElementById('tab-cnt-results').innerText = stats.totalResults;
    document.getElementById('tab-cnt-notifs').innerText = stats.unreadNotifications;

    const indicator = document.getElementById('db-indicator');
    if (json.database.connected) {
      indicator.innerText = `● DB: ${json.database.mode} (${json.database.databaseName})`;
      indicator.className = 'badge badge-success';
    } else {
      indicator.innerText = `○ DB: ${json.database.mode}`;
      indicator.className = 'badge badge-warning';
    }
  } catch (err) {
    console.warn('Overview load warning:', err);
  }
}

async function reconnectDB() {
  const indicator = document.getElementById('db-indicator');
  indicator.innerText = 'Testing MySQL connection...';
  try {
    const res = await fetch('/api/placement/reconnect-db', { method: 'POST' });
    const json = await res.json();
    alert(json.message);
    loadOverview();
  } catch (err) {
    alert('DB Reconnect request failed: ' + err.message);
  }
}

// ==========================================
// 1. Student Management
// ==========================================
async function loadStudents() {
  const tbody = document.getElementById('students-tbody');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading students...</td></tr>';
  try {
    const res = await fetch('/api/placement/students');
    const json = await res.json();
    tbody.innerHTML = '';
    if (!json.students || json.students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No student records found.</td></tr>';
      return;
    }

    json.students.forEach(s => {
      const isEligible = s.is_eligible !== undefined ? Boolean(s.is_eligible) : true;
      const statusBadge = isEligible
        ? '<span class="badge badge-success">Eligible</span>'
        : '<span class="badge badge-danger">Not Eligible</span>';

      const resumeLink = s.resume_url
        ? `<a href="${s.resume_url}" target="_blank" style="color: var(--accent); font-weight: 600;">View PDF</a>`
        : '<span style="color: var(--text-muted);">-</span>';

      tbody.innerHTML += `
        <tr>
          <td><strong>#${s.id}</strong></td>
          <td><strong>${s.name}</strong></td>
          <td><code>${s.usn}</code></td>
          <td>${s.email}</td>
          <td>${s.department}</td>
          <td><strong>${s.cgpa}</strong></td>
          <td>${s.graduation_year}</td>
          <td>${resumeLink}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick='openEditStudentModal(${JSON.stringify(s)})'>Edit</button>
              <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteStudent(${s.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

function openAddStudentModal() {
  document.getElementById('student-modal-title').innerText = 'Add New Student';
  document.getElementById('student-id').value = '';
  document.getElementById('student-name').value = '';
  document.getElementById('student-usn').value = '';
  document.getElementById('student-email').value = '';
  document.getElementById('student-email').disabled = false;
  document.getElementById('student-phone').value = '';
  document.getElementById('student-dept').value = 'Computer Science';
  document.getElementById('student-cgpa').value = '8.50';
  document.getElementById('student-grad-year').value = '2026';
  document.getElementById('student-resume').value = '';
  document.getElementById('student-eligible').checked = true;
  document.getElementById('student-submit-btn').innerText = 'Save Student';
  openModal('student-modal');
}

function openEditStudentModal(s) {
  document.getElementById('student-modal-title').innerText = `Edit Student #${s.id} (${s.name})`;
  document.getElementById('student-id').value = s.id;
  document.getElementById('student-name').value = s.name;
  document.getElementById('student-usn').value = s.usn;
  document.getElementById('student-email').value = s.email;
  document.getElementById('student-phone').value = s.phone || '';
  document.getElementById('student-dept').value = s.department;
  document.getElementById('student-cgpa').value = s.cgpa;
  document.getElementById('student-grad-year').value = s.graduation_year;
  document.getElementById('student-resume').value = s.resume_url || '';
  document.getElementById('student-eligible').checked = Boolean(s.is_eligible);
  document.getElementById('student-submit-btn').innerText = 'Update Student';
  openModal('student-modal');
}

async function saveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('student-id').value;
  const payload = {
    name: document.getElementById('student-name').value.trim(),
    usn: document.getElementById('student-usn').value.trim(),
    email: document.getElementById('student-email').value.trim(),
    phone: document.getElementById('student-phone').value.trim(),
    department: document.getElementById('student-dept').value,
    cgpa: parseFloat(document.getElementById('student-cgpa').value),
    graduation_year: parseInt(document.getElementById('student-grad-year').value, 10),
    resume_url: document.getElementById('student-resume').value.trim(),
    is_eligible: document.getElementById('student-eligible').checked
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/placement/students/${id}` : '/api/placement/students';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('student-modal');
    loadStudents();
    loadOverview();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteStudent(id) {
  if (!confirm(`Are you sure you want to delete Student #${id}? This will also delete related applications.`)) return;
  try {
    const res = await fetch(`/api/placement/students/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadStudents();
    loadOverview();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

// ==========================================
// 2. Company Management
// ==========================================
async function loadCompanies() {
  const tbody = document.getElementById('companies-tbody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Loading companies...</td></tr>';
  try {
    const res = await fetch('/api/placement/companies');
    const json = await res.json();
    tbody.innerHTML = '';
    allCompanies = json.companies || [];

    if (allCompanies.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No companies registered.</td></tr>';
      return;
    }

    allCompanies.forEach(c => {
      const siteLink = c.website
        ? `<a href="${c.website}" target="_blank" style="color: var(--accent); font-weight: 600;">Visit Site</a>`
        : '<span style="color: var(--text-muted);">-</span>';

      tbody.innerHTML += `
        <tr>
          <td><strong>#${c.id}</strong></td>
          <td><strong>${c.company_name}</strong></td>
          <td><span class="badge badge-neutral">${c.industry}</span></td>
          <td>${siteLink}</td>
          <td>${c.contact_person}</td>
          <td>${c.contact_email}</td>
          <td><span class="badge badge-info">${c.total_drives || 0} Drives</span></td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick='openEditCompanyModal(${JSON.stringify(c)})'>Edit</button>
              <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteCompany(${c.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

function openAddCompanyModal() {
  document.getElementById('company-modal-title').innerText = 'Add Recruiting Company';
  document.getElementById('company-id').value = '';
  document.getElementById('company-name').value = '';
  document.getElementById('company-industry').value = '';
  document.getElementById('company-website').value = '';
  document.getElementById('company-contact-person').value = '';
  document.getElementById('company-contact-email').value = '';
  document.getElementById('company-submit-btn').innerText = 'Save Company';
  openModal('company-modal');
}

function openEditCompanyModal(c) {
  document.getElementById('company-modal-title').innerText = `Edit Company #${c.id} (${c.company_name})`;
  document.getElementById('company-id').value = c.id;
  document.getElementById('company-name').value = c.company_name;
  document.getElementById('company-industry').value = c.industry;
  document.getElementById('company-website').value = c.website || '';
  document.getElementById('company-contact-person').value = c.contact_person;
  document.getElementById('company-contact-email').value = c.contact_email;
  document.getElementById('company-submit-btn').innerText = 'Update Company';
  openModal('company-modal');
}

async function saveCompany(e) {
  e.preventDefault();
  const id = document.getElementById('company-id').value;
  const payload = {
    company_name: document.getElementById('company-name').value.trim(),
    industry: document.getElementById('company-industry').value.trim(),
    website: document.getElementById('company-website').value.trim(),
    contact_person: document.getElementById('company-contact-person').value.trim(),
    contact_email: document.getElementById('company-contact-email').value.trim()
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/placement/companies/${id}` : '/api/placement/companies';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('company-modal');
    loadCompanies();
    loadOverview();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteCompany(id) {
  if (!confirm(`Are you sure you want to delete Company #${id}? This cascades to associated drives.`)) return;
  try {
    const res = await fetch(`/api/placement/companies/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadCompanies();
    loadOverview();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

// ==========================================
// 3. Placement Drive Management
// ==========================================
async function loadDrives() {
  const tbody = document.getElementById('drives-tbody');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading drives...</td></tr>';
  try {
    const res = await fetch('/api/placement/drives');
    const json = await res.json();
    tbody.innerHTML = '';
    allDrives = json.drives || [];

    if (allDrives.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No placement drives scheduled.</td></tr>';
      return;
    }

    allDrives.forEach(d => {
      let statusClass = 'badge-info';
      if (d.status === 'active') statusClass = 'badge-success';
      if (d.status === 'completed') statusClass = 'badge-neutral';
      if (d.status === 'cancelled') statusClass = 'badge-danger';

      const dateStr = d.drive_date ? new Date(d.drive_date).toLocaleDateString() : '';

      tbody.innerHTML += `
        <tr>
          <td><strong>${d.title}</strong></td>
          <td>${d.company_name}</td>
          <td>${d.job_role}</td>
          <td><span class="badge badge-success">${d.ctc_lpa} LPA</span></td>
          <td><strong>${d.min_cgpa}</strong></td>
          <td><span style="font-size: 0.8rem;">${d.eligible_branches}</span></td>
          <td>${dateStr}</td>
          <td><span class="badge ${statusClass}">${d.status}</span></td>
          <td><span class="badge badge-accent">${d.total_applicants || 0} Apps</span></td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick='openEditDriveModal(${JSON.stringify(d)})'>Edit</button>
              <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteDrive(${d.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

async function openAddDriveModal() {
  document.getElementById('drive-modal-title').innerText = 'Create Placement Drive';
  document.getElementById('drive-id').value = '';
  document.getElementById('drive-title').value = '';
  document.getElementById('drive-role').value = '';
  document.getElementById('drive-ctc').value = '20.00';
  document.getElementById('drive-min-cgpa').value = '7.00';
  document.getElementById('drive-branches').value = 'All';
  document.getElementById('drive-date').value = '2026-11-25';
  document.getElementById('drive-status').value = 'active';
  document.getElementById('drive-submit-btn').innerText = 'Save Drive';

  // Populate company select
  const compSelect = document.getElementById('drive-company-id');
  compSelect.innerHTML = '';
  if (allCompanies.length === 0) {
    const res = await fetch('/api/placement/companies');
    const json = await res.json();
    allCompanies = json.companies || [];
  }
  allCompanies.forEach(c => {
    compSelect.innerHTML += `<option value="${c.id}">${c.company_name} (${c.industry})</option>`;
  });

  openModal('drive-modal');
}

async function openEditDriveModal(d) {
  document.getElementById('drive-modal-title').innerText = `Edit Drive #${d.id} (${d.title})`;
  document.getElementById('drive-id').value = d.id;
  document.getElementById('drive-title').value = d.title;
  document.getElementById('drive-role').value = d.job_role;
  document.getElementById('drive-ctc').value = d.ctc_lpa;
  document.getElementById('drive-min-cgpa').value = d.min_cgpa;
  document.getElementById('drive-branches').value = d.eligible_branches;
  document.getElementById('drive-status').value = d.status;

  if (d.drive_date) {
    const dt = new Date(d.drive_date);
    document.getElementById('drive-date').value = dt.toISOString().split('T')[0];
  }

  // Populate company select
  const compSelect = document.getElementById('drive-company-id');
  compSelect.innerHTML = '';
  if (allCompanies.length === 0) {
    const res = await fetch('/api/placement/companies');
    const json = await res.json();
    allCompanies = json.companies || [];
  }
  allCompanies.forEach(c => {
    const sel = c.id === d.company_id ? 'selected' : '';
    compSelect.innerHTML += `<option value="${c.id}" ${sel}>${c.company_name}</option>`;
  });

  document.getElementById('drive-submit-btn').innerText = 'Update Drive';
  openModal('drive-modal');
}

async function saveDrive(e) {
  e.preventDefault();
  const id = document.getElementById('drive-id').value;
  const payload = {
    company_id: parseInt(document.getElementById('drive-company-id').value, 10),
    title: document.getElementById('drive-title').value.trim(),
    job_role: document.getElementById('drive-role').value.trim(),
    ctc_lpa: parseFloat(document.getElementById('drive-ctc').value),
    min_cgpa: parseFloat(document.getElementById('drive-min-cgpa').value),
    eligible_branches: document.getElementById('drive-branches').value.trim(),
    drive_date: document.getElementById('drive-date').value,
    status: document.getElementById('drive-status').value
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/placement/drives/${id}` : '/api/placement/drives';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('drive-modal');
    loadDrives();
    loadOverview();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteDrive(id) {
  if (!confirm(`Are you sure you want to delete Placement Drive #${id}? This cascades to associated rounds and schedules.`)) return;
  try {
    const res = await fetch(`/api/placement/drives/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadDrives();
    loadOverview();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

// ==========================================
// 4. Application Management
// ==========================================
async function loadApplications() {
  const tbody = document.getElementById('applications-tbody');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">Loading applications...</td></tr>';
  const statusFilter = document.getElementById('filter-app-status').value;
  try {
    let url = '/api/placement/applications';
    if (statusFilter) url += `?status=${statusFilter}`;
    const res = await fetch(url);
    const json = await res.json();
    tbody.innerHTML = '';
    allApplications = json.applications || [];

    if (allApplications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No candidate applications found.</td></tr>';
      return;
    }

    allApplications.forEach(a => {
      let badgeClass = 'badge-info';
      if (a.status === 'shortlisted') badgeClass = 'badge-accent';
      if (a.status === 'in_progress') badgeClass = 'badge-warning';
      if (a.status === 'selected') badgeClass = 'badge-success';
      if (a.status === 'rejected') badgeClass = 'badge-danger';

      tbody.innerHTML += `
        <tr>
          <td><strong>#APP-00${a.id}</strong></td>
          <td><strong>${a.student_name}</strong></td>
          <td><code>${a.usn}</code></td>
          <td>${a.student_dept}</td>
          <td><strong>${a.cgpa}</strong></td>
          <td>${a.drive_title}</td>
          <td>${a.company_name}</td>
          <td><span class="badge badge-neutral">${a.current_round_name || 'Stage 1'}</span></td>
          <td><span class="badge ${badgeClass}">${a.status}</span></td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-success" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="updateAppStatus(${a.id}, 'shortlisted')">Shortlist</button>
              <button type="button" class="btn btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="updateAppStatus(${a.id}, 'selected')">Select</button>
              <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="updateAppStatus(${a.id}, 'rejected')">Reject</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

async function updateAppStatus(appId, status) {
  try {
    const res = await fetch(`/api/placement/applications/${appId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, remarks: `Status updated by Admin to ${status}` })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadApplications();
    loadOverview();
  } catch (err) {
    alert('Update status error: ' + err.message);
  }
}

// ==========================================
// 5. Interview Schedules & Rounds Management
// ==========================================
async function loadSchedules() {
  const tbody = document.getElementById('schedules-tbody');
  tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;">Loading schedules...</td></tr>';
  try {
    const res = await fetch('/api/placement/schedules');
    const json = await res.json();
    tbody.innerHTML = '';
    const schedules = json.schedules || [];

    if (schedules.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--text-muted);">No interviews currently scheduled.</td></tr>';
      return;
    }

    schedules.forEach(s => {
      let badgeClass = 'badge-success';
      if (s.status === 'completed') badgeClass = 'badge-neutral';
      if (s.status === 'cancelled') badgeClass = 'badge-danger';

      const sTime = s.start_time ? new Date(s.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
      const eTime = s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      tbody.innerHTML += `
        <tr>
          <td><strong>#SCH-${s.id}</strong></td>
          <td><strong>${s.student_name}</strong></td>
          <td><code>${s.usn}</code></td>
          <td>${s.drive_title}</td>
          <td><span class="badge badge-info">${s.round_name}</span></td>
          <td><strong>${s.room_number}</strong> (${s.building})</td>
          <td>${s.interviewer_name}</td>
          <td>${sTime}</td>
          <td>${eTime}</td>
          <td><span class="badge ${badgeClass}">${s.status}</span></td>
          <td>
            <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="cancelSchedule(${s.id})">Cancel</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

async function cancelSchedule(id) {
  if (!confirm(`Are you sure you want to cancel / delete Interview Schedule #${id}?`)) return;
  try {
    const res = await fetch(`/api/placement/schedules/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadSchedules();
    loadOverview();
  } catch (err) {
    alert('Cancel schedule error: ' + err.message);
  }
}

async function openScheduleModal() {
  document.getElementById('schedule-modal-title').innerText = 'Schedule Conflict-Free Interview';
  document.getElementById('schedule-id').value = '';
  document.getElementById('sched-notes').value = 'Placement Technical Interview';

  // 1. Populate Candidate Applications dropdown
  const appSelect = document.getElementById('sched-app-id');
  appSelect.innerHTML = '<option value="">-- Select Candidate Application --</option>';
  const appRes = await fetch('/api/placement/applications');
  const appJson = await appRes.json();
  allApplications = appJson.applications || [];
  allApplications.forEach(a => {
    appSelect.innerHTML += `<option value="${a.id}" data-drive-id="${a.drive_id}">${a.student_name} (${a.usn}) - ${a.drive_title}</option>`;
  });

  // 2. Populate Rooms
  const roomSelect = document.getElementById('sched-room-id');
  roomSelect.innerHTML = '';
  const roomRes = await fetch('/api/placement/rooms');
  const roomJson = await roomRes.json();
  allRooms = roomJson.rooms || [];
  allRooms.filter(r => r.is_active).forEach(r => {
    roomSelect.innerHTML += `<option value="${r.id}">${r.room_number} (${r.building}, Floor ${r.floor}) - ${r.room_type}</option>`;
  });

  // 3. Populate Interviewers
  const invSelect = document.getElementById('sched-interviewer-id');
  invSelect.innerHTML = '';
  const invRes = await fetch('/api/placement/interviewers');
  const invJson = await invRes.json();
  allInterviewers = invJson.interviewers || [];
  allInterviewers.forEach(i => {
    invSelect.innerHTML += `<option value="${i.id}">${i.name} (${i.employee_code} - ${i.department})</option>`;
  });

  openModal('schedule-modal');
}

async function handleSchedAppChange() {
  const appSelect = document.getElementById('sched-app-id');
  const selectedOption = appSelect.options[appSelect.selectedIndex];
  const driveId = selectedOption.getAttribute('data-drive-id');
  const roundSelect = document.getElementById('sched-round-id');
  roundSelect.innerHTML = '';

  if (driveId) {
    const res = await fetch(`/api/placement/rounds?drive_id=${driveId}`);
    const json = await res.json();
    (json.rounds || []).forEach(r => {
      roundSelect.innerHTML += `<option value="${r.id}">Round ${r.round_number}: ${r.round_name} (${r.round_type})</option>`;
    });
  }
}

async function saveSchedule(e) {
  e.preventDefault();
  const payload = {
    application_id: parseInt(document.getElementById('sched-app-id').value, 10),
    round_id: parseInt(document.getElementById('sched-round-id').value, 10),
    room_id: parseInt(document.getElementById('sched-room-id').value, 10),
    interviewer_id: parseInt(document.getElementById('sched-interviewer-id').value, 10),
    start_time: document.getElementById('sched-start-time').value.replace('T', ' ') + ':00',
    end_time: document.getElementById('sched-end-time').value.replace('T', ' ') + ':00',
    notes: document.getElementById('sched-notes').value.trim()
  };

  try {
    const res = await fetch('/api/placement/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) {
      if (json.conflictType) {
        throw new Error(`[${json.conflictType}] ${json.message}`);
      }
      throw new Error(json.message);
    }
    alert(json.message);
    closeModal('schedule-modal');
    loadSchedules();
    loadOverview();
  } catch (err) {
    alert('Scheduling Conflict / Error:\n' + err.message);
  }
}

// Interviewers
async function loadInterviewers() {
  const tbody = document.getElementById('interviewers-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading interviewers...</td></tr>';
  try {
    const res = await fetch('/api/placement/interviewers');
    const json = await res.json();
    tbody.innerHTML = '';
    allInterviewers = json.interviewers || [];

    allInterviewers.forEach(i => {
      tbody.innerHTML += `
        <tr>
          <td><code>${i.employee_code}</code></td>
          <td><strong>${i.name}</strong></td>
          <td>${i.department}</td>
          <td>${i.designation}</td>
          <td>
            <button type="button" class="btn btn-danger" style="padding: 0.15rem 0.45rem; font-size: 0.75rem;" onclick="deleteInterviewer(${i.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

function openAddInterviewerModal() {
  document.getElementById('interviewer-name').value = '';
  document.getElementById('interviewer-code').value = '';
  document.getElementById('interviewer-email').value = '';
  document.getElementById('interviewer-dept').value = 'Computer Science';
  document.getElementById('interviewer-designation').value = 'Associate Professor';
  document.getElementById('interviewer-spec').value = '';
  openModal('interviewer-modal');
}

async function saveInterviewer(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('interviewer-name').value.trim(),
    employee_code: document.getElementById('interviewer-code').value.trim(),
    email: document.getElementById('interviewer-email').value.trim(),
    department: document.getElementById('interviewer-dept').value.trim(),
    designation: document.getElementById('interviewer-designation').value.trim(),
    specialization: document.getElementById('interviewer-spec').value.trim()
  };

  try {
    const res = await fetch('/api/placement/interviewers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('interviewer-modal');
    loadInterviewers();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteInterviewer(id) {
  if (!confirm(`Delete Interviewer #${id}?`)) return;
  try {
    const res = await fetch(`/api/placement/interviewers/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadInterviewers();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

// Rounds
async function loadRounds() {
  const tbody = document.getElementById('rounds-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading rounds...</td></tr>';
  try {
    const res = await fetch('/api/placement/rounds');
    const json = await res.json();
    tbody.innerHTML = '';
    (json.rounds || []).forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${r.drive_title}</strong></td>
          <td><span class="badge badge-info">R${r.round_number}</span></td>
          <td>${r.round_name}</td>
          <td><span class="badge badge-neutral">${r.round_type}</span></td>
          <td>${r.pass_score}%</td>
          <td>
            <button type="button" class="btn btn-danger" style="padding: 0.15rem 0.45rem; font-size: 0.75rem;" onclick="deleteRound(${r.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

async function openAddRoundModal() {
  const select = document.getElementById('round-drive-id');
  select.innerHTML = '';
  if (allDrives.length === 0) {
    const res = await fetch('/api/placement/drives');
    const json = await res.json();
    allDrives = json.drives || [];
  }
  allDrives.forEach(d => {
    select.innerHTML += `<option value="${d.id}">${d.title} (${d.company_name})</option>`;
  });
  openModal('round-modal');
}

async function saveRound(e) {
  e.preventDefault();
  const payload = {
    drive_id: parseInt(document.getElementById('round-drive-id').value, 10),
    round_number: parseInt(document.getElementById('round-num').value, 10),
    round_name: document.getElementById('round-name').value.trim(),
    round_type: document.getElementById('round-type').value,
    pass_score: parseFloat(document.getElementById('round-pass-score').value),
    duration_minutes: parseInt(document.getElementById('round-duration').value, 10)
  };

  try {
    const res = await fetch('/api/placement/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('round-modal');
    loadRounds();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteRound(id) {
  if (!confirm(`Delete Round #${id}?`)) return;
  try {
    const res = await fetch(`/api/placement/rounds/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadRounds();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

// ==========================================
// 6. Room Management & Availability
// ==========================================
async function loadRooms() {
  const tbody = document.getElementById('rooms-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading rooms...</td></tr>';
  try {
    const res = await fetch('/api/placement/rooms');
    const json = await res.json();
    tbody.innerHTML = '';
    allRooms = json.rooms || [];

    const checkSelect = document.getElementById('check-room-id');
    checkSelect.innerHTML = '';

    allRooms.forEach(r => {
      const activeBadge = r.is_active
        ? '<span class="badge badge-success">Available</span>'
        : '<span class="badge badge-danger">Maintenance</span>';

      checkSelect.innerHTML += `<option value="${r.id}">${r.room_number} - ${r.building} (${r.room_type})</option>`;

      tbody.innerHTML += `
        <tr>
          <td><strong>${r.room_number}</strong></td>
          <td>${r.building}</td>
          <td>Floor ${r.floor}</td>
          <td>${r.capacity} pax</td>
          <td><span class="badge badge-neutral">${r.room_type}</span></td>
          <td>${activeBadge}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick='openEditRoomModal(${JSON.stringify(r)})'>Edit</button>
              <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteRoom(${r.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

function openAddRoomModal() {
  document.getElementById('room-modal-title').innerText = 'Add Physical Room / Venue';
  document.getElementById('room-id').value = '';
  document.getElementById('room-number').value = '';
  document.getElementById('room-building').value = 'Placement Block';
  document.getElementById('room-floor').value = '1';
  document.getElementById('room-capacity').value = '1';
  document.getElementById('room-type').value = 'cabin';
  document.getElementById('room-active').checked = true;
  document.getElementById('room-submit-btn').innerText = 'Save Room';
  openModal('room-modal');
}

function openEditRoomModal(r) {
  document.getElementById('room-modal-title').innerText = `Edit Room #${r.id} (${r.room_number})`;
  document.getElementById('room-id').value = r.id;
  document.getElementById('room-number').value = r.room_number;
  document.getElementById('room-building').value = r.building;
  document.getElementById('room-floor').value = r.floor;
  document.getElementById('room-capacity').value = r.capacity;
  document.getElementById('room-type').value = r.room_type;
  document.getElementById('room-active').checked = Boolean(r.is_active);
  document.getElementById('room-submit-btn').innerText = 'Update Room';
  openModal('room-modal');
}

async function saveRoom(e) {
  e.preventDefault();
  const id = document.getElementById('room-id').value;
  const payload = {
    room_number: document.getElementById('room-number').value.trim(),
    building: document.getElementById('room-building').value.trim(),
    floor: parseInt(document.getElementById('room-floor').value, 10),
    capacity: parseInt(document.getElementById('room-capacity').value, 10),
    room_type: document.getElementById('room-type').value,
    is_active: document.getElementById('room-active').checked
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/placement/rooms/${id}` : '/api/placement/rooms';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('room-modal');
    loadRooms();
    loadOverview();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteRoom(id) {
  if (!confirm(`Are you sure you want to delete Room #${id}?`)) return;
  try {
    const res = await fetch(`/api/placement/rooms/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadRooms();
    loadOverview();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

async function handleCheckRoomAvailability(e) {
  e.preventDefault();
  const roomId = document.getElementById('check-room-id').value;
  const startTime = document.getElementById('check-start-time').value.replace('T', ' ') + ':00';
  const endTime = document.getElementById('check-end-time').value.replace('T', ' ') + ':00';
  const box = document.getElementById('check-result-box');

  box.style.display = 'block';
  box.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Checking availability against active schedules...</div>';

  try {
    const res = await fetch('/api/placement/rooms/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, start_time: startTime, end_time: endTime })
    });
    const json = await res.json();

    if (json.available) {
      box.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 1rem; border-radius: 6px;">
          <strong>✓ Room is Available!</strong><br>
          <span style="font-size: 0.85rem;">Zero spatial collisions detected in Room <strong>${json.room.room_number}</strong> for the requested interval (${startTime} – ${endTime}).</span>
        </div>
      `;
    } else {
      let conflictsHtml = '';
      (json.conflictingSchedules || []).forEach(c => {
        conflictsHtml += `<li>Schedule #${c.id || c.scheduleId}: ${c.start_time || c.existingStart} to ${c.end_time || c.existingEnd}</li>`;
      });
      box.innerHTML = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 1rem; border-radius: 6px;">
          <strong>✕ Spatial Conflict Detected!</strong><br>
          <span style="font-size: 0.85rem;">Room <strong>${json.room.room_number}</strong> is already booked for:</span>
          <ul style="margin-top: 0.5rem; padding-left: 1.25rem; font-size: 0.8rem;">${conflictsHtml}</ul>
        </div>
      `;
    }
  } catch (err) {
    box.innerHTML = `<div style="color: var(--danger); font-size: 0.85rem;">Check failed: ${err.message}</div>`;
  }
}

// ==========================================
// 7. Results Management
// ==========================================
async function loadResults() {
  const tbody = document.getElementById('results-tbody');
  tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;">Loading results...</td></tr>';
  try {
    const res = await fetch('/api/placement/results');
    const json = await res.json();
    tbody.innerHTML = '';
    const results = json.results || [];

    if (results.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--text-muted);">No interview results declared yet.</td></tr>';
      return;
    }

    results.forEach(r => {
      let badgeClass = 'badge-success';
      if (r.decision === 'on_hold') badgeClass = 'badge-warning';
      if (r.decision === 'rejected') badgeClass = 'badge-danger';

      const dateStr = r.declared_at ? new Date(r.declared_at).toLocaleDateString() : '';

      tbody.innerHTML += `
        <tr>
          <td><strong>#RES-${r.id}</strong></td>
          <td><strong>${r.student_name}</strong></td>
          <td><code>${r.usn}</code></td>
          <td>${r.student_dept}</td>
          <td>${r.drive_title}</td>
          <td>${r.company_name}</td>
          <td><strong>${r.total_score} / 100</strong></td>
          <td><span class="badge ${badgeClass}">${r.decision.toUpperCase()}</span></td>
          <td style="max-width: 200px; font-size: 0.8rem;">${r.remarks || '-'}</td>
          <td>${dateStr}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick='openEditResultModal(${JSON.stringify(r)})'>Edit</button>
              <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteResult(${r.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

async function openResultModal() {
  document.getElementById('result-modal-title').innerText = 'Record Candidate Result & Decision';
  document.getElementById('result-id').value = '';
  document.getElementById('result-app-group').style.display = 'block';
  document.getElementById('result-score').value = '85.00';
  document.getElementById('result-decision').value = 'selected';
  document.getElementById('result-remarks').value = 'Recommended for final placement offer.';

  const appSelect = document.getElementById('result-app-id');
  appSelect.innerHTML = '';
  if (allApplications.length === 0) {
    const res = await fetch('/api/placement/applications');
    const json = await res.json();
    allApplications = json.applications || [];
  }
  allApplications.forEach(a => {
    appSelect.innerHTML += `<option value="${a.id}">#APP-${a.id}: ${a.student_name} (${a.usn}) - ${a.drive_title}</option>`;
  });

  openModal('result-modal');
}

function openEditResultModal(r) {
  document.getElementById('result-modal-title').innerText = `Edit Result #RES-${r.id} (${r.student_name})`;
  document.getElementById('result-id').value = r.id;
  document.getElementById('result-app-group').style.display = 'none'; // application cannot change
  document.getElementById('result-score').value = r.total_score;
  document.getElementById('result-decision').value = r.decision;
  document.getElementById('result-remarks').value = r.remarks || '';
  openModal('result-modal');
}

async function saveResult(e) {
  e.preventDefault();
  const id = document.getElementById('result-id').value;
  const payload = {
    total_score: parseFloat(document.getElementById('result-score').value),
    decision: document.getElementById('result-decision').value,
    remarks: document.getElementById('result-remarks').value.trim()
  };

  if (!id) {
    payload.application_id = parseInt(document.getElementById('result-app-id').value, 10);
  }

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/placement/results/${id}` : '/api/placement/results';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('result-modal');
    loadResults();
    loadOverview();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteResult(id) {
  if (!confirm(`Are you sure you want to delete Result #${id}?`)) return;
  try {
    const res = await fetch(`/api/placement/results/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    loadResults();
    loadOverview();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

// ==========================================
// 8. Notifications Management
// ==========================================
async function loadNotifications() {
  const tbody = document.getElementById('notifications-tbody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Loading notifications...</td></tr>';
  try {
    const res = await fetch('/api/placement/notifications');
    const json = await res.json();
    tbody.innerHTML = '';
    const notifs = json.notifications || [];

    if (notifs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No system notifications recorded.</td></tr>';
      return;
    }

    notifs.forEach(n => {
      const isUnread = n.status === 'unread';
      const statusBadge = isUnread
        ? '<span class="badge badge-accent">Unread</span>'
        : '<span class="badge badge-neutral">Read</span>';

      const timeStr = n.created_at ? new Date(n.created_at).toLocaleString() : '';

      tbody.innerHTML += `
        <tr>
          <td><strong>#${n.id}</strong></td>
          <td>${n.email || `User #${n.user_id}`}</td>
          <td><span class="badge badge-info">${n.role || 'user'}</span></td>
          <td><strong>${n.title}</strong></td>
          <td style="max-width: 250px; font-size: 0.8rem;">${n.message}</td>
          <td>${statusBadge}</td>
          <td style="font-size: 0.75rem; color: var(--text-muted);">${timeStr}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              ${isUnread ? `<button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="markNotificationRead(${n.id})">Mark Read</button>` : ''}
              <button type="button" class="btn btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteNotification(${n.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color: var(--danger); text-align: center;">Failed to load: ${err.message}</td></tr>`;
  }
}

async function openSendNotificationModal() {
  const userSelect = document.getElementById('notif-user-id');
  userSelect.innerHTML = '';
  const res = await fetch('/api/placement/users');
  const json = await res.json();
  allUsers = json.users || [];
  allUsers.forEach(u => {
    userSelect.innerHTML += `<option value="${u.id}">${u.email} (${u.role.toUpperCase()})</option>`;
  });
  document.getElementById('notif-title').value = '';
  document.getElementById('notif-message').value = '';
  openModal('notif-modal');
}

async function saveNotification(e) {
  e.preventDefault();
  const payload = {
    user_id: parseInt(document.getElementById('notif-user-id').value, 10),
    title: document.getElementById('notif-title').value.trim(),
    message: document.getElementById('notif-message').value.trim()
  };

  try {
    const res = await fetch('/api/placement/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    alert(json.message);
    closeModal('notif-modal');
    loadNotifications();
    loadOverview();
  } catch (err) {
    alert('Send notification error: ' + err.message);
  }
}

async function markNotificationRead(id) {
  try {
    const res = await fetch(`/api/placement/notifications/${id}/read`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    loadNotifications();
    loadOverview();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteNotification(id) {
  if (!confirm(`Delete Notification #${id}?`)) return;
  try {
    const res = await fetch(`/api/placement/notifications/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    loadNotifications();
    loadOverview();
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}

// ==========================================
// Initial Boot
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadOverview();
  loadStudents();
});
