// State Arrays
let tasks = JSON.parse(localStorage.getItem('pwa_tasks')) || [];
let history = JSON.parse(localStorage.getItem('pwa_history')) || [];

// DOM References
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const buttonsContainer = document.getElementById('buttons-container');
const historyLog = document.getElementById('history-log');

const timeTypeSelect = document.getElementById('time-type');
const periodGroup = document.getElementById('period-input-group');
const specificGroup = document.getElementById('specific-input-group');

const repeatTypeSelect = document.getElementById('repeat-type');
const daysGroup = document.getElementById('days-input-group');
const untilDateGroup = document.getElementById('until-date-input-group');

// Register Service Worker for Offline access
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker Registered'))
      .catch(err => console.log('SW registration failed:', err));
  });
}

// Event Listeners for UI Form Fields Switches
timeTypeSelect.addEventListener('change', (e) => {
  if (e.target.value === 'period') {
    periodGroup.classList.remove('hidden');
    specificGroup.classList.add('hidden');
  } else {
    periodGroup.classList.add('hidden');
    specificGroup.classList.remove('hidden');
  }
});

repeatTypeSelect.addEventListener('change', (e) => {
  if (e.target.value === 'days') {
    daysGroup.classList.remove('hidden');
    untilDateGroup.classList.add('hidden');
  } else {
    daysGroup.classList.add('hidden');
    untilDateGroup.classList.remove('hidden');
  }
});

openModalBtn.addEventListener('click', () => taskModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => taskModal.classList.add('hidden'));

// Save Task Form Handler
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const title = document.getElementById('task-title').value;
  const timeType = timeTypeSelect.value;
  const timeValue = timeType === 'period' ? document.getElementById('task-period').value : document.getElementById('task-time').value;
  const repeatType = repeatTypeSelect.value;
  
  let repeatDetails = {};
  if (repeatType === 'days') {
    const checkedDays = Array.from(document.querySelectorAll('.days-checkboxes input:checked')).map(cb => parseInt(cb.value));
    repeatDetails.days = checkedDays; // array of integers 0-6
  } else {
    repeatDetails.untilDate = document.getElementById('repeat-until').value; // string date YYYY-MM-DD
  }

  const newTask = {
    id: Date.now().toString(),
    title,
    timeType,
    timeValue,
    repeatType,
    repeatDetails
  };

  tasks.push(newTask);
  localStorage.setItem('pwa_tasks', JSON.stringify(tasks));
  taskForm.reset();
  taskModal.classList.add('hidden');
  
  renderDailyButtons();
});

// Helper: Get local Date standard context strings
function getLocalDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Logic to check if task appears today
function isTaskScheduledForDate(task, date) {
  const dayOfWeek = date.getDay();
  const dateString = getLocalDateString(date);

  if (task.repeatType === 'days') {
    // If no specific days checked, assume everyday safety fallback
    if (!task.repeatDetails.days || task.repeatDetails.days.length === 0) return true;
    return task.repeatDetails.days.includes(dayOfWeek);
  } else if (task.repeatType === 'until-date') {
    if (!task.repeatDetails.untilDate) return true;
    return dateString <= task.repeatDetails.untilDate;
  }
  return false;
}

// Render Main App Matrix Interaction Screen Dashboard
function renderDailyButtons() {
  buttonsContainer.innerHTML = '';
  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Filter out which configurations run today
  const todaysTasks = tasks.filter(t => isTaskScheduledForDate(t, today));

  if (todaysTasks.length === 0) {
    buttonsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color:#666;">No tasks scheduled for today. Add some above!</p>';
    return;
  }

  todaysTasks.forEach(task => {
    const btn = document.createElement('div');
    btn.className = 'task-btn';
    
    // Evaluate execution state check inside structural parameters
    const isDoneToday = history.some(h => h.taskId === task.id && h.date === todayStr);
    
    if (isDoneToday) {
      btn.classList.add('completed');
    } else {
      btn.classList.add('active');
    }

    btn.innerHTML = `
      <div>${task.title}</div>
      <div class="time-lbl">${task.timeValue}</div>
    `;

    // Process tap/click interaction cycle
    btn.addEventListener('click', () => {
      if (isDoneToday) {
        // Toggle Back: Remove from history logs
        history = history.filter(h => !(h.taskId === task.id && h.date === todayStr));
      } else {
        // Toggle Completed: Add entry to history log
        history.push({
          id: Date.now().toString(),
          taskId: task.id,
          taskTitle: task.title,
          date: todayStr,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      localStorage.setItem('pwa_history', JSON.stringify(history));
      renderDailyButtons();
      renderHistoryLog();
    });

    buttonsContainer.appendChild(btn);
  });
}

// Render History View for modifications
function renderHistoryLog() {
  historyLog.innerHTML = '';
  if (history.length === 0) {
    historyLog.innerHTML = '<p style="color:#666;">No item tasks logged yet.</p>';
    return;
  }

  // Render reverse chronological order (newest first)
  [...history].reverse().forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';
    itemEl.innerHTML = `
      <div>
        <strong>${item.taskTitle}</strong> - ${item.date} @ ${item.timestamp}
      </div>
      <button onclick="deleteHistoryItem('${item.id}')">Delete / Undo</button>
    `;
    historyLog.appendChild(itemEl);
  });
}

// Global scope execution assignment for item processing triggers
window.deleteHistoryItem = function(id) {
  history = history.filter(h => h.id !== id);
  localStorage.setItem('pwa_history', JSON.stringify(history));
  renderDailyButtons();
  renderHistoryLog();
};

// Initial Render on startup
renderDailyButtons();
renderHistoryLog();
