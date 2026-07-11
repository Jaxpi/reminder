// Local Persistence Keys
let tasks = JSON.parse(localStorage.getItem('pwa_tasks')) || [];
let history = JSON.parse(localStorage.getItem('pwa_history')) || [];
let isHistoryExpanded = false;

// DOM Hook Points
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const buttonsContainer = document.getElementById('buttons-container');
const historyLog = document.getElementById('history-log');
const historyToggleHeader = document.getElementById('history-toggle-header');
const toggleArrow = document.getElementById('toggle-arrow');

// Form Element Hooks
const taskTimeText = document.getElementById('task-time-text');
const clockTriggerBtn = document.getElementById('clock-trigger-btn');
const hiddenClockInput = document.getElementById('hidden-clock-input');
const untilToggleBtn = document.getElementById('until-toggle-btn');
const hiddenUntilDate = document.getElementById('hidden-until-date');
const selectedUntilSpan = document.getElementById('selected-until-span');
const dailyCheckbox = document.getElementById('daily-checkbox');
const dayCheckboxes = document.querySelectorAll('.days-checkboxes input[type="checkbox"]:not(#daily-checkbox)');
const closeModalBtn = document.getElementById('close-modal-btn');

// PWA Service Worker Hook Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
  });
}

// Collapsible History Event Log Trigger
historyToggleHeader.addEventListener('click', () => {
  isHistoryExpanded = !isHistoryExpanded;
  if (isHistoryExpanded) {
    historyLog.classList.remove('hidden');
    toggleArrow.innerText = '▼';
  } else {
    historyLog.classList.add('hidden');
    toggleArrow.innerText = '►';
  }
});

// Trigger native clock picker when clicking the icon button
clockTriggerBtn.addEventListener('click', () => {
  hiddenClockInput.showPicker(); 
});
hiddenClockInput.addEventListener('change', (e) => {
  if(e.target.value) {
    taskTimeText.value = e.target.value; 
  }
});

// Trigger native calendar picker when clicking the "Until" button
untilToggleBtn.addEventListener('click', () => {
  hiddenUntilDate.showPicker();
});
hiddenUntilDate.addEventListener('change', (e) => {
  if(e.target.value) {
    selectedUntilSpan.innerText = e.target.value;
    selectedUntilSpan.classList.remove('hidden');
  } else {
    selectedUntilSpan.classList.add('hidden');
  }
});

// "Daily" Checkbox master toggle behavior
dailyCheckbox.addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  dayCheckboxes.forEach(cb => cb.checked = isChecked);
});

// If any day checkbox is manually unchecked, turn off the Daily toggle status
dayCheckboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    if (!cb.checked) {
      dailyCheckbox.checked = false;
    } else {
      const allChecked = Array.from(dayCheckboxes).every(item => item.checked);
      if (allChecked) dailyCheckbox.checked = true;
    }
  });
});

closeModalBtn.addEventListener('click', () => {
  taskModal.classList.add('hidden');
  resetFormState();
});

function resetFormState() {
  taskForm.reset();
  selectedUntilSpan.innerText = '';
  selectedUntilSpan.classList.add('hidden');
}

// Save logic handling data creation rules
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const title = document.getElementById('task-title').value;
  const timeValue = taskTimeText.value;
  const checkedDays = Array.from(dayCheckboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));
  const untilDate = hiddenUntilDate.value || null;

  const newTask = {
    id: Date.now().toString(),
    title,
    timeValue,
    days: checkedDays, 
    untilDate: untilDate,
    order: tasks.length // Append to bottom sequence stack initially
  };

  tasks.push(newTask);
  saveTasks();
  resetFormState();
  taskModal.classList.add('hidden');
  renderDailyButtons();
});

function saveTasks() {
  localStorage.setItem('pwa_tasks', JSON.stringify(tasks));
}

// Utility: Local timezone safe string parse rules
function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}

function isTaskScheduledForDate(task, date) {
  const dayOfWeek = date.getDay();
  const todayStr = getLocalDateString(date);

  // Filter 1: If an "Until Date" constraint exists, confirm it hasn't expired
  if (task.untilDate && todayStr > task.untilDate) {
    return false;
  }
  // Filter 2: Verify day array inclusion requirements
  if (task.days && task.days.length > 0) {
    return task.days.includes(dayOfWeek);
  }
  return true; // Absolute default fallback
}

// Render Core Task Dashboard Grid
function renderDailyButtons() {
  buttonsContainer.innerHTML = '';
  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Always keep configurations aligned with persistent order priorities
  tasks.sort((a, b) => (a.order || 0) - (b.order || 0));

  // Render valid daily task assignments
  tasks.forEach(task => {
    if (!isTaskScheduledForDate(task, today)) return;

    const btn = document.createElement('div');
    btn.className = 'task-btn';
    btn.setAttribute('draggable', 'true');
    btn.setAttribute('data-id', task.id);
    
    const isDoneToday = history.some(h => h.taskId === task.id && h.date === todayStr);
    btn.classList.add(isDoneToday ? 'completed' : 'active');

    btn.innerHTML = `
      <div>${task.title}</div>
      <div class="time-lbl">${task.timeValue}</div>
    `;

    // Click/Tap toggle events handling
    btn.addEventListener('click', (e) => {
      // Ignore click processing during moving sequence cycles
      if (btn.classList.contains('dragging')) return;

      if (isDoneToday) {
        history = history.filter(h => !(h.taskId === task.id && h.date === todayStr));
      } else {
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

    // Attach native Drag & Drop processing listeners
    btn.addEventListener('dragstart', () => btn.classList.add('dragging'));
    btn.addEventListener('dragend', () => btn.classList.remove('dragging'));

    buttonsContainer.appendChild(btn);
  });

  // Always insert the Green creation button at the tail position of the grid layout
  const createBtn = document.createElement('div');
  createBtn.className = 'create-btn';
  createBtn.innerHTML = `
    <div style="font-size: 1.8rem; margin-bottom: 0.2rem;">+</div>
    <div>Add</div>
  `;
  createBtn.addEventListener('click', () => taskModal.classList.remove('hidden'));
  buttonsContainer.appendChild(createBtn);

  initDragAndDropListeners();
}

// Drag & Drop tracking reorder implementation mechanics
function initDragAndDropListeners() {
  buttonsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingEl = document.querySelector('.task-btn.dragging');
    if (!draggingEl) return;

    // Detect grid siblings bounding bounds excluding the green creation tile
    const siblings = Array.from(buttonsContainer.querySelectorAll('.task-btn:not(.dragging)'));
    
    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect();
      // Evaluate drag positioning vectors against item cross centers
      return (e.clientX < box.left + box.width / 2) && (e.clientY < box.top + box.height / 2) || (e.clientY < box.bottom && e.clientX < box.right);
    });

    if (nextSibling) {
      buttonsContainer.insertBefore(draggingEl, nextSibling);
    } else {
      // Place before creation button node elements safety checks
      const createTile = buttonsContainer.querySelector('.create-btn');
      buttonsContainer.insertBefore(draggingEl, createTile);
    }
  });

  buttonsContainer.addEventListener('drop', () => {
    // Re-index application data arrays following screen layout sequences
    const currentRenderedButtons = Array.from(buttonsContainer.querySelectorAll('.task-btn'));
    
    currentRenderedButtons.forEach((btn, idx) => {
      const id = btn.getAttribute('data-id');
      const targetTask = tasks.find(t => t.id === id);
      if (targetTask) targetTask.order = idx;
    });

    saveTasks();
  });
}

// Display completion events tracking logs (Newest / Most recent at top position)
function renderHistoryLog() {
  historyLog.innerHTML = '';
  if (history.length === 0) {
    historyLog.innerHTML = '<p style="color:#666; margin: 0;">No item tasks logged yet.</p>';
    return;
  }

  // Slice copies to avoid modifying root values when calling reverse iterations
  [...history].reverse().forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';
    itemEl.innerHTML = `
      <div>
        <strong>${item.taskTitle}</strong> - ${item.date} @ ${item.timestamp}
      </div>
      <button onclick="deleteHistoryItem('${item.id}')">Delete</button>
    `;
    historyLog.appendChild(itemEl);
  });
}

// Global hook execution wrapper mapping deletion commands back safely
window.deleteHistoryItem = function(id) {
  history = history.filter(h => h.id !== id);
  localStorage.setItem('pwa_history', JSON.stringify(history));
  renderDailyButtons();
  renderHistoryLog();
};

// Application Init Sequence
renderDailyButtons();
renderHistoryLog();