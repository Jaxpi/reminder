// ==========================================
// 1. STATE ARRAYS & STORAGE KEYS
// ==========================================
let tasks = JSON.parse(localStorage.getItem('pwa_tasks')) || [];
let history = JSON.parse(localStorage.getItem('pwa_history')) || [];
let isHistoryExpanded = false;
let isEditModeActive = false;

// ==========================================
// 2. DOM HOOK POINTS & ELEMENT REFERENCES
// ==========================================
const taskModal = document.getElementById('task-modal');
const modalHeading = document.getElementById('modal-heading');
const taskForm = document.getElementById('task-form');
const editTaskIdInput = document.getElementById('edit-task-id');
const deleteTaskBtn = document.getElementById('delete-task-btn');
const buttonsContainer = document.getElementById('buttons-container');
const historyLog = document.getElementById('history-log');
const historyToggleHeader = document.getElementById('history-toggle-header');
const toggleArrow = document.getElementById('toggle-arrow');
const editModeToggle = document.getElementById('edit-mode-toggle');

// Form Element Hooks
const taskTimeText = document.getElementById('task-time-text');
const clockTriggerBtn = document.getElementById('clock-trigger-btn');
const hiddenClockInput = document.getElementById('hidden-clock-input');
const timeSuggestions = document.getElementById('time-suggestions');

const startToggleBtn = document.getElementById('start-toggle-btn');
const hiddenStartDate = document.getElementById('hidden-start-date');
const selectedStartSpan = document.getElementById('selected-start-span');

const untilToggleBtn = document.getElementById('until-toggle-btn');
const hiddenUntilDate = document.getElementById('hidden-until-date');
const selectedUntilSpan = document.getElementById('selected-until-span');

const dailyCheckbox = document.getElementById('daily-checkbox');
const dayCheckboxes = document.querySelectorAll('.days-checkboxes input[type="checkbox"]:not(#daily-checkbox)');
const closeModalBtn = document.getElementById('close-modal-btn');

// ==========================================
// 3. AUTOMATED SERVICE WORKER REGISTRATION
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => {
        reg.update();
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch(err => console.log('Registration Failed:', err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// ==========================================
// 4. EVENT LISTENERS & INTERACTION LOGIC
// ==========================================
editModeToggle.addEventListener('click', () => {
  isEditModeActive = !isEditModeActive;
  if (isEditModeActive) {
    editModeToggle.innerText = "Edit Mode: On";
    editModeToggle.className = "toggle-btn-active";
  } else {
    editModeToggle.innerText = "Edit Mode: Off";
    editModeToggle.className = "toggle-btn-inactive";
  }
  renderDailyButtons();
});

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

document.addEventListener('click', (e) => {
  if (taskTimeText.contains(e.target)) {
    timeSuggestions.classList.remove('hidden');
    return;
  }
  if (e.target.classList.contains('chip')) {
    taskTimeText.value = e.target.innerText;
    timeSuggestions.classList.add('hidden');
    taskTimeText.blur();
    return;
  }
  if (!timeSuggestions.contains(e.target) && !clockTriggerBtn.contains(e.target)) {
    timeSuggestions.classList.add('hidden');
  }
});

clockTriggerBtn.addEventListener('click', () => { hiddenClockInput.showPicker(); });
hiddenClockInput.addEventListener('change', (e) => { if(e.target.value) taskTimeText.value = e.target.value; });

startToggleBtn.addEventListener('click', () => { hiddenStartDate.showPicker(); });
hiddenStartDate.addEventListener('change', (e) => {
  if(e.target.value) {
    selectedStartSpan.innerText = e.target.value;
    selectedStartSpan.classList.remove('hidden');
  } else {
    selectedStartSpan.classList.add('hidden');
  }
});

untilToggleBtn.addEventListener('click', () => { hiddenUntilDate.showPicker(); });
hiddenUntilDate.addEventListener('change', (e) => {
  if(e.target.value) {
    selectedUntilSpan.innerText = e.target.value;
    selectedUntilSpan.classList.remove('hidden');
  } else {
    selectedUntilSpan.classList.add('hidden');
  }
});

dailyCheckbox.addEventListener('change', (e) => {
  dayCheckboxes.forEach(cb => cb.checked = e.target.checked);
});
dayCheckboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    dailyCheckbox.checked = Array.from(dayCheckboxes).every(item => item.checked);
  });
});

closeModalBtn.addEventListener('click', () => {
  taskModal.classList.add('hidden');
  resetFormState();
});

function resetFormState() {
  taskForm.reset();
  editTaskIdInput.value = '';
  modalHeading.innerText = 'Task';
  deleteTaskBtn.classList.add('hidden');
  selectedUntilSpan.innerText = '';
  selectedUntilSpan.classList.add('hidden');
  selectedStartSpan.innerText = '';
  selectedStartSpan.classList.add('hidden');
  timeSuggestions.classList.add('hidden');
}

// ==========================================
// 5. TIMEZONE-SAFE DATE COMPARISONS
// ==========================================
function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return '';
  const match = /^([0-2][0-9]):([0-5][0-9])$/.exec(timeStr.trim());
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${hours}:${minutes} ${ampm}`;
}

function isTaskScheduledForDate(task, targetDate) {
  const dayOfWeek = targetDate.getDay();
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();

  function parseDateString(str) {
    if (!str || typeof str !== 'string' || str.trim() === "") return null;
    const parts = str.split('-');
    if (parts.length < 3) return null;
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10)
    };
  }

  if (task.startDate) {
    const start = parseDateString(task.startDate);
    if (start) {
      if (targetYear < start.year) return false;
      if (targetYear === start.year && targetMonth < start.month) return false;
      if (targetYear === start.year && targetMonth === start.month && targetDay < start.day) return false;
    }
  }

  if (task.untilDate) {
    const until = parseDateString(task.untilDate);
    if (until) {
      if (targetYear > until.year) return false;
      if (targetYear === until.year && targetMonth > until.month) return false;
      if (targetYear === until.year && targetMonth === until.month && targetDay > until.day) return false;
    }
  }

  if (task.days && task.days.length > 0) {
    return task.days.includes(dayOfWeek);
  }
  return true; 
}
// ==========================================
// 6. SAVE, UPDATE & DELETE TASK FORM HANDLERS
// ==========================================
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const title = document.getElementById('task-title').value;
  const timeValue = taskTimeText.value;
  const checkedDays = Array.from(dayCheckboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));
  const startDate = hiddenStartDate.value || null;
  const untilDate = hiddenUntilDate.value || null;
  const targetId = editTaskIdInput.value;

  if (targetId) {
    const taskIndex = tasks.findIndex(t => t.id === targetId);
    if (taskIndex !== -1) {
      tasks[taskIndex].title = title;
      tasks[taskIndex].timeValue = timeValue;
      tasks[taskIndex].days = checkedDays;
      tasks[taskIndex].startDate = startDate;
      tasks[taskIndex].untilDate = untilDate;
    }
  } else {
    const newTask = {
      id: Date.now().toString(),
      title,
      timeValue,
      days: checkedDays, 
      startDate: startDate,
      untilDate: untilDate,
      order: tasks.length
    };
    tasks.push(newTask);
  }

  saveTasks();
  resetFormState();
  taskModal.classList.add('hidden');
  renderDailyButtons();
});

deleteTaskBtn.addEventListener('click', () => {
  const targetId = editTaskIdInput.value;
  if (!targetId) return;

  if (confirm("Are you sure you want to delete this task completely?")) {
    tasks = tasks.filter(t => t.id !== targetId);
    history = history.filter(h => h.taskId !== targetId);
    saveTasks();
    localStorage.setItem('pwa_history', JSON.stringify(history));
    resetFormState();
    taskModal.classList.add('hidden');
    renderDailyButtons();
    renderHistoryLog();
  }
});

function saveTasks() {
  localStorage.setItem('pwa_tasks', JSON.stringify(tasks));
}

function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}

// ==========================================
// 7. RENDER LOGIC (GRID & HISTORY)
// ==========================================
function renderDailyButtons() {
  buttonsContainer.innerHTML = '';
  const today = new Date();
  const todayStr = getLocalDateString(today);

  tasks.sort((a, b) => (a.order || 0) - (b.order || 0));

  tasks.forEach(task => {
    if (!isEditModeActive && !isTaskScheduledForDate(task, today)) return;

    const btn = document.createElement('div');
    btn.className = 'task-btn';
    btn.setAttribute('data-id', task.id);
    
    if (!isEditModeActive) {
      btn.setAttribute('draggable', 'true');
    } else {
      btn.classList.add('editing-shake');
    }
    
    const isDoneToday = history.some(h => h.taskId === task.id && h.date === todayStr);
    btn.classList.add(isDoneToday ? 'completed' : 'active');

    const formattedDisplayTime = formatTimeTo12Hour(task.timeValue);
    const displayTime = (isEditModeActive && task.startDate && todayStr < task.startDate) 
      ? `${formattedDisplayTime} (Starts: ${task.startDate})` 
      : formattedDisplayTime;

    btn.innerHTML = `
      <div>${task.title}</div>
      <div class="time-lbl">${displayTime}</div>
    `;

    btn.addEventListener('click', () => {
      if (btn.classList.contains('dragging')) return;

      if (isEditModeActive) {
        modalHeading.innerText = 'Edit Task';
        editTaskIdInput.value = task.id;
        document.getElementById('task-title').value = task.title;
        taskTimeText.value = task.timeValue;
        
        const activeDays = task.days || [];
        dayCheckboxes.forEach(cb => {
          cb.checked = activeDays.includes(parseInt(cb.value));
        });
        dailyCheckbox.checked = Array.from(dayCheckboxes).every(item => item.checked);

        if (task.startDate) {
          hiddenStartDate.value = task.startDate;
          selectedStartSpan.innerText = task.startDate;
          selectedStartSpan.classList.remove('hidden');
        }
        if (task.untilDate) {
          hiddenUntilDate.value = task.untilDate;
          selectedUntilSpan.innerText = task.untilDate;
          selectedUntilSpan.classList.remove('hidden');
        }

        deleteTaskBtn.classList.remove('hidden');
        taskModal.classList.remove('hidden');
      } else {
        if (isDoneToday) {
          history = history.filter(h => !(h.taskId === task.id && h.date === todayStr));
        } else {
          history.push({
            id: Date.now().toString(),
            taskId: task.id,
            taskTitle: task.title,
            taskScheduledTime: formattedDisplayTime, // Capture the intended set time string
            date: todayStr,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
        localStorage.setItem('pwa_history', JSON.stringify(history));
        renderDailyButtons();
        renderHistoryLog();
      }
    });

    if (!isEditModeActive) {
      btn.addEventListener('dragstart', () => btn.classList.add('dragging'));
      btn.addEventListener('dragend', () => btn.classList.remove('dragging'));
    }

    buttonsContainer.appendChild(btn);
  });

  const createBtn = document.createElement('div');
  createBtn.className = 'create-btn';
  createBtn.innerHTML = `
    <div style="font-size: 1.8rem; margin-bottom: 0.2rem;">+</div>
    <div>Add</div>
  `;
  createBtn.addEventListener('click', () => {
    resetFormState();
    modalHeading.innerText = 'Task';
    taskModal.classList.remove('hidden');
  });
  buttonsContainer.appendChild(createBtn);

  if (!isEditModeActive) {
    initDragAndDropListeners();
  }

  updateAppBadgeCount();
}

function initDragAndDropListeners() {
  buttonsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingEl = document.querySelector('.task-btn.dragging');
    if (!draggingEl) return;

    const siblings = Array.from(buttonsContainer.querySelectorAll('.task-btn:not(.dragging)'));
    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect();
      return (e.clientX < box.left + box.width / 2) && (e.clientY < box.top + box.height / 2) || (e.clientY < box.bottom && e.clientX < box.right);
    });

    if (nextSibling) {
      buttonsContainer.insertBefore(draggingEl, nextSibling);
    } else {
      const createTile = buttonsContainer.querySelector('.create-btn');
      buttonsContainer.insertBefore(draggingEl, createTile);
    }
  });

  buttonsContainer.addEventListener('drop', () => {
    const currentRenderedButtons = Array.from(buttonsContainer.querySelectorAll('.task-btn'));
    currentRenderedButtons.forEach((btn, idx) => {
      const id = btn.getAttribute('data-id');
      const targetTask = tasks.find(t => t.id === id);
      if (targetTask) targetTask.order = idx;
    });
    saveTasks();
  });
}

function renderHistoryLog() {
  historyLog.innerHTML = '';
  if (history.length === 0) {
    historyLog.innerHTML = '<p style="color:#666; margin: 0;">No items logged yet.</p>';
    return;
  }

  [...history].reverse().forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';
    
    // Safely pull the historical scheduled time value with a clean fallback check
    const scheduledTimeInfo = item.taskScheduledTime ? `(Set for: ${item.taskScheduledTime})` : '';
    
    itemEl.innerHTML = `
      <div>
        <strong>${item.taskTitle}</strong> ${scheduledTimeInfo} - ${item.date} @ ${item.timestamp}
      </div>
      <button onclick="deleteHistoryItem('${item.id}')">Delete</button>
    `;
    historyLog.appendChild(itemEl);
  });
}

window.deleteHistoryItem = function(id) {
  history = history.filter(h => h.id !== id);
  localStorage.setItem('pwa_history', JSON.stringify(history));
  renderDailyButtons();
  renderHistoryLog();
};

function updateAppBadgeCount() {
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const todaysTasks = tasks.filter(t => isTaskScheduledForDate(t, today));
  
  const remainingCount = todaysTasks.filter(task => {
    return !history.some(h => h.taskId === task.id && h.date === todayStr);
  }).length;

  if ('setAppBadge' in navigator) {
    if (remainingCount > 0) {
      navigator.setAppBadge(remainingCount).catch(err => console.log(err));
    } else {
      navigator.clearAppBadge().catch(err => console.log(err));
    }
  }
}

// ==========================================
// 8. INITIAL STARTUP SEQUENCES
// ==========================================
renderDailyButtons();
renderHistoryLog();