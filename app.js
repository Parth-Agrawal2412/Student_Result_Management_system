const STORAGE_KEY = 'scholara-students-v2';
const SUBJECTS = ['Mathematics', 'Science', 'English', 'History'];
const CHART_DATA = {
  'Last 6 months': [58, 62, 66, 74, 78, 88],
  'This term': [64, 69, 73, 85, 81, 92]
};
const seedStudents = [];

let students = JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedStudents;
let activeDirectory = false;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function saveStudents() { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); }
function resultFor(student) {
  const values = SUBJECTS.map(subject => Number(student.marks[subject]) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const percentage = total / SUBJECTS.length;
  const grade = percentage >= 90 ? 'A' : percentage >= 75 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';
  return { total, percentage, grade, status: percentage >= 50 ? 'pass' : 'fail' };
}
function initials(name) { return name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase(); }
function formatAverage(value) { return `${Math.round(value)}%`; }
function populateClassFilters() {
  const grades = [...new Set(students.map(student => student.grade))].sort();
  $$('#classFilter, #directoryClassFilter').forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="all">All classes</option>' + grades.map(grade => `<option value="${grade}">${grade}</option>`).join('');
    select.value = grades.includes(current) ? current : 'all';
  });
}
function getFilteredStudents(directory = false) {
  const search = $(`#${directory ? 'directorySearch' : 'studentSearch'}`).value.toLowerCase().trim();
  const grade = $(`#${directory ? 'directoryClassFilter' : 'classFilter'}`).value;
  const status = $(`#${directory ? 'directoryStatusFilter' : 'statusFilter'}`).value;
  return students.filter(student => {
    const result = resultFor(student);
    return (!search || student.fullName.toLowerCase().includes(search) || student.rollNumber.toLowerCase().includes(search)) && (grade === 'all' || student.grade === grade) && (status === 'all' || result.status === status);
  });
}
function rowMarkup(student) {
  const result = resultFor(student);
  return `<tr class="student-row"><td><div class="student-cell"><span class="student-avatar">${initials(student.fullName)}</span><span class="student-name">${student.fullName}<small>${student.email}</small></span></div></td><td>${student.rollNumber}</td><td>${student.grade} <span class="muted">· ${student.section}</span></td><td class="average">${formatAverage(result.percentage)}</td><td><span class="status ${result.status}">${result.status === 'pass' ? 'Passed' : 'Needs attention'}</span></td><td><button class="icon-btn row-actions edit-student" data-id="${student.id}" aria-label="Edit ${student.fullName}">•••</button></td></tr>`;
}
function renderTables() {
  const filtered = getFilteredStudents(false);
  const directoryFiltered = getFilteredStudents(true);
  $('#studentTableBody').innerHTML = filtered.slice(0, 5).map(rowMarkup).join('');
  $('#directoryTableBody').innerHTML = directoryFiltered.map(rowMarkup).join('');
  $('#emptyState').hidden = filtered.length > 0;
  $('#resultCount').textContent = `Showing ${filtered.length} student${filtered.length === 1 ? '' : 's'}`;
  $$('.edit-student').forEach(button => button.addEventListener('click', () => openModal(button.dataset.id)));
}
function renderMetrics() {
  const results = students.map(resultFor);
  const average = results.length ? results.reduce((sum, result) => sum + result.percentage, 0) / results.length : 0;
  const passed = results.filter(result => result.status === 'pass').length;
  $('#totalStudents').textContent = students.length;
  $('#averageScore').textContent = formatAverage(average);
  $('#passRate').textContent = formatAverage(students.length ? passed / students.length * 100 : 0);
  $('#atRisk').textContent = results.filter(result => result.status === 'fail').length;
  $('#donutValue').textContent = formatAverage(average);
  const counts = ['A', 'B', 'C', 'D', 'F'].map(grade => results.filter(result => result.grade === grade).length);
  const colors = ['#6373df', '#76b4ec', '#edaf6f', '#9bc5a9', '#d7d9e3'];
  $('#gradeLegend').innerHTML = ['A', 'B', 'C', 'D', 'F'].map((grade, index) => `<div class="legend-row"><i style="background:${colors[index]}"></i>${grade}<strong>${counts[index]}</strong></div>`).join('');
}
function renderReports() {
  $('#reportCards').innerHTML = students.map(student => { const result = resultFor(student); return `<article class="report-card"><div class="student-cell"><span class="student-avatar">${initials(student.fullName)}</span><span class="student-name">${student.fullName}<small>${student.rollNumber} · ${student.grade} ${student.section}</small></span></div><div class="report-stat"><span>Average score</span><strong>${formatAverage(result.percentage)}</strong></div><div class="report-stat"><span>Grade</span><strong>${result.grade}</strong></div><div class="report-stat"><span>Status</span><strong class="${result.status}">${result.status === 'pass' ? 'Passed' : 'Needs attention'}</strong></div><button class="outline-btn report-print" data-id="${student.id}">▣ Print report card</button></article>`; }).join('');
  $$('.report-print').forEach(button => button.addEventListener('click', () => printStudent(button.dataset.id)));
}
function render() {
  populateClassFilters();
  renderMetrics();
  renderTables();
  renderReports();
  renderChart($('#chartPeriod')?.value || 'Last 6 months');
}
function buildChartPath(values, width = 660, height = 230, padding = { top: 18, right: 8, bottom: 18, left: 0 }) {
  const max = 100;
  const min = 0;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const stepX = innerWidth / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => {
    const x = padding.left + index * stepX;
    const y = height - padding.bottom - ((value - min) / (max - min || 1)) * innerHeight;
    return { x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const current = points[i];
    const cpX = (prev.x + current.x) / 2;
    path += ` Q ${prev.x} ${prev.y} ${cpX} ${(prev.y + current.y) / 2} T ${current.x} ${current.y}`;
  }
  return path;
}
function renderChart(period) {
  const values = CHART_DATA[period] || CHART_DATA['Last 6 months'];
  const linePath = $('.chart-line');
  const areaPath = $('.chart-fill');
  const line = buildChartPath(values);
  const area = `${line} L 652 230 L 0 230 Z`;
  if (linePath) linePath.setAttribute('d', line);
  if (areaPath) areaPath.setAttribute('d', area);
}
function applyTheme(themeMode) {
  const isDark = themeMode === 'dark';
  document.documentElement.setAttribute('data-theme', themeMode);
  document.body.classList.toggle('dark-mode', isDark);
  const toggle = $('#themeToggle');
  const icon = toggle?.querySelector('.theme-toggle-icon');
  const text = toggle?.querySelector('.theme-toggle-text');
  if (toggle && icon && text) {
    icon.textContent = isDark ? '☾' : '☀';
    text.textContent = isDark ? 'Dark' : 'Light';
  }
  localStorage.setItem('scholara-theme', themeMode);
}
function initializeTheme() {
  const savedTheme = localStorage.getItem('scholara-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
}
function renderToday() { $('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()); }
function updateChartPeriod(period) {
  const labels = period === 'This term' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'] : ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  $$('.x-labels span').forEach((label, index) => { label.textContent = labels[index]; });
  renderChart(period);
  showToast(`Chart updated for ${period.toLowerCase()}.`);
}
function openModal(id = null) {
  const student = students.find(item => item.id === id);
  $('#studentForm').reset(); $('#studentId').value = id || ''; $('#modalTitle').textContent = student ? 'Edit student' : 'Add student'; $('#modalEyebrow').textContent = student ? 'Student record' : 'New record'; $('#deleteStudentBtn').hidden = !student;
  if (student) { ['fullName', 'rollNumber', 'grade', 'section', 'email', 'dateOfBirth'].forEach(field => { $(`#${field}`).value = student[field]; }); $$('.mark-input').forEach(input => { input.value = student.marks[input.dataset.subject]; }); }
  updateMarksPreview(); $('#studentModal').hidden = false; $('#fullName').focus();
}
function closeModal() { $('#studentModal').hidden = true; }
function updateMarksPreview() { const total = $$('.mark-input').reduce((sum, input) => sum + (Number(input.value) || 0), 0); $('#marksTotalPreview').textContent = `${total} / 400`; }
function submitStudent(event) {
  event.preventDefault();
  const id = $('#studentId').value || Date.now().toString();
  const record = { id, fullName: $('#fullName').value.trim(), rollNumber: $('#rollNumber').value.trim(), grade: $('#grade').value.trim(), section: $('#section').value.trim(), email: $('#email').value.trim(), dateOfBirth: $('#dateOfBirth').value, marks: {} };
  $$('.mark-input').forEach(input => { record.marks[input.dataset.subject] = Math.max(0, Math.min(100, Number(input.value) || 0)); });
  const duplicate = students.some(student => student.rollNumber.toLowerCase() === record.rollNumber.toLowerCase() && student.id !== id);
  if (duplicate) { showToast('That roll number is already in use.'); $('#rollNumber').focus(); return; }
  const existingIndex = students.findIndex(student => student.id === id); if (existingIndex >= 0) students[existingIndex] = record; else students.unshift(record);
  saveStudents(); closeModal(); render(); showToast(existingIndex >= 0 ? 'Student record updated.' : 'Student added to the directory.');
}
function deleteStudent() { const id = $('#studentId').value; const student = students.find(item => item.id === id); if (!student || !window.confirm(`Delete ${student.fullName}'s record?`)) return; students = students.filter(item => item.id !== id); saveStudents(); closeModal(); render(); showToast('Student record deleted.'); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600); }
function exportCsv() { const header = ['Full Name', 'Roll Number', 'Class', 'Section', 'Email', 'Date of Birth', ...SUBJECTS, 'Total Marks', 'Percentage', 'Grade', 'Status']; const rows = students.map(student => { const result = resultFor(student); return [student.fullName, student.rollNumber, student.grade, student.section, student.email, student.dateOfBirth, ...SUBJECTS.map(subject => student.marks[subject]), result.total, result.percentage.toFixed(1), result.grade, result.status === 'pass' ? 'Passed' : 'Needs attention']; }); const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'scholara-student-results.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV export downloaded.'); }
function printClass() { $('#printReport').innerHTML = `<h1>Northbridge Academy · Class Results</h1><div class="print-meta">Generated ${new Date().toLocaleDateString()}</div><table class="print-table"><thead><tr><th>Student</th><th>Roll number</th><th>Class</th><th>Total / 400</th><th>Percentage</th><th>Grade</th><th>Status</th></tr></thead><tbody>${students.map(student => { const result = resultFor(student); return `<tr><td>${student.fullName}</td><td>${student.rollNumber}</td><td>${student.grade} ${student.section}</td><td>${result.total}</td><td>${result.percentage.toFixed(1)}%</td><td>${result.grade}</td><td class="print-badge">${result.status === 'pass' ? 'Passed' : 'Needs attention'}</td></tr>`; }).join('')}</tbody></table>`; window.print(); }
function printStudent(id) { const student = students.find(item => item.id === id); if (!student) return; const result = resultFor(student); $('#printReport').innerHTML = `<div class="single-report"><div class="student-heading"><div><h1>Northbridge Academy</h1><div class="print-meta">Student report card · ${new Date().toLocaleDateString()}</div></div><strong>${student.rollNumber}</strong></div><h2>${student.fullName}</h2><div class="print-meta">${student.grade} · Section ${student.section} · ${student.email}</div><table class="print-table"><thead><tr><th>Subject</th><th>Marks</th></tr></thead><tbody>${SUBJECTS.map(subject => `<tr><td>${subject}</td><td>${student.marks[subject]} / 100</td></tr>`).join('')}</tbody></table><div class="result-box"><div><span>Total</span><strong>${result.total}/400</strong></div><div><span>Percentage</span><strong>${result.percentage.toFixed(1)}%</strong></div><div><span>Grade</span><strong>${result.grade}</strong></div><div><span>Status</span><strong>${result.status === 'pass' ? 'Passed' : 'Needs attention'}</strong></div></div><div class="signature">Class teacher</div></div>`; window.print(); }
function switchView(view) { $$('.page-view').forEach(section => section.classList.toggle('active', section.id === `${view}View`)); $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); $('#breadcrumb-current').textContent = view[0].toUpperCase() + view.slice(1); }

$$('.nav-item').forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
['addStudentTop', 'addStudentHero', 'addStudentDirectory', 'addClassStudent'].forEach(id => $(`#${id}`).addEventListener('click', () => openModal()));
$('#closeModal').addEventListener('click', closeModal); $('#cancelModal').addEventListener('click', closeModal); $('#studentForm').addEventListener('submit', submitStudent); $('#deleteStudentBtn').addEventListener('click', deleteStudent); $$('.mark-input').forEach(input => input.addEventListener('input', updateMarksPreview));
['studentSearch', 'classFilter', 'statusFilter', 'directorySearch', 'directoryClassFilter', 'directoryStatusFilter'].forEach(id => $(`#${id}`).addEventListener('input', renderTables));
$('#resetFilters').addEventListener('click', () => { $('#studentSearch').value = ''; $('#classFilter').value = 'all'; $('#statusFilter').value = 'all'; renderTables(); });
$('#exportCsvTop').addEventListener('click', exportCsv); $('#printClassBtn').addEventListener('click', printClass); $('#printReportsBtn').addEventListener('click', printClass); $('#viewReportsBtn').addEventListener('click', () => switchView('reports')); $('#viewAllStudents').addEventListener('click', () => switchView('students'));
$('#notificationBtn').addEventListener('click', () => showToast('You have no new notifications.'));
$('#helpBtn').addEventListener('click', () => showToast('Use Add student to create a record, then enter marks to calculate results.'));
$('#accountBtn').addEventListener('click', () => showToast('Signed in as Administrator.'));
$('#gradeOptionsBtn').addEventListener('click', () => showToast('Grade breakdown is calculated from all saved student results.'));
$('#themeToggle').addEventListener('click', () => {
  const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(nextTheme);
});
$('#chartPeriod').addEventListener('change', event => updateChartPeriod(event.target.value));
$('#studentModal').addEventListener('click', event => { if (event.target.id === 'studentModal') closeModal(); });
initializeTheme();
renderToday(); render();
