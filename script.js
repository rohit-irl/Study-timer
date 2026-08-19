// ==========================================
// SMART STUDY TIMER WITH DAILY TASK SYSTEM
// ==========================================

// ==========================================
// STATE & CONFIG
// ==========================================

/**
 * Configuration constants
 */
const CONFIG = {
    USERS_KEY: 'studyapp_users',
    CURRENT_USER_KEY: 'studyapp_current_user',
    DARK_MODE_KEY: 'studyapp_dark_mode',
    MIN_STUDY_FOR_STREAK: 30 * 60, // 30 minutes fallback
    MOTIVATIONS: [
        '💡 Keep pushing! Every minute counts.',
        '🚀 You\'re building great habits!',
        '🏆 Consistency is the key to success.',
        '⚡ Great focus! Keep the momentum going.',
        '🎯 You\'re on fire! Keep studying.',
        '💪 Challenge yourself to go further!',
        '✨ Your future self will thank you.',
        '🔥 You\'re crushing it! Keep going.',
        '🧠 Learning is a superpower.',
        '📚 Knowledge is power. Keep learning!',
        '⏳ Time invested in learning pays dividends.',
        '🌟 You\'re making remarkable progress!',
    ],
};

/**
 * Global application state
 */
let appState = {
    currentUser: null,
    timerRunning: false,
    timerPaused: false,
    sessionStartTime: null,
    sessionPausedTime: 0,
    timerInterval: null,
    activeTaskId: null, // Active task currently selected for timer
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const DOM = {
    // Auth screens
    loginScreen: document.getElementById('loginScreen'),
    signupScreen: document.getElementById('signupScreen'),
    dashboard: document.getElementById('dashboard'),

    // Auth forms
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),

    // Logout & Header
    logoutBtn: document.getElementById('logoutBtn'),
    userGreeting: document.getElementById('userGreeting'),

    // Stats
    currentStreak: document.getElementById('currentStreak'),
    bestStreak: document.getElementById('bestStreak'),
    lifetimeTotal: document.getElementById('lifetimeTotal'),
    weekTotal: document.getElementById('weekTotal'),

    // Active Task Banner
    activeTaskBanner: document.getElementById('activeTaskBanner'),
    activeTaskName: document.getElementById('activeTaskName'),

    // Timer displays
    sessionDisplay: document.getElementById('sessionDisplay'),
    todayDisplay2: document.getElementById('todayDisplay2'),
    bigTimer: document.getElementById('bigTimer'),

    // Timer controls
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    stopBtn: document.getElementById('stopBtn'),
    resetBtn: document.getElementById('resetBtn'),

    // Daily Progress
    taskCompletionCount: document.getElementById('taskCompletionCount'),
    taskCompletionPercent: document.getElementById('taskCompletionPercent'),
    taskProgressFill: document.getElementById('taskProgressFill'),
    completionBanner: document.getElementById('completionBanner'),

    // Tasks Section
    taskDateBadge: document.getElementById('taskDateBadge'),
    copyYesterdayBtn: document.getElementById('copyYesterdayBtn'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    tasksList: document.getElementById('tasksList'),

    // Task Modal
    taskModal: document.getElementById('taskModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
    taskForm: document.getElementById('taskForm'),
    taskId: document.getElementById('taskId'),
    taskName: document.getElementById('taskName'),
    targetHours: document.getElementById('targetHours'),
    targetMinutes: document.getElementById('targetMinutes'),
    modalTitle: document.getElementById('modalTitle'),

    // Tracking
    todayTracking: document.getElementById('todayTracking'),
    yesterdayTracking: document.getElementById('yesterdayTracking'),
    weekTracking: document.getElementById('weekTracking'),
    bestDayTracking: document.getElementById('bestDayTracking'),
    todayDisplay: document.getElementById('todayDisplay'),

    // Motivation
    motivationText: document.getElementById('motivationText'),
    newMotivationBtn: document.getElementById('newMotivationBtn'),

    // Chart
    studyChart: document.getElementById('studyChart'),

    // Theme
    themToggle: document.getElementById('themToggle'),

    // Notification
    notification: document.getElementById('notification'),
};

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize the entire application
 */
function initializeApp() {
    loadTheme();
    setupEventListeners();

    if (!checkAuth()) {
        return;
    }

    appState.currentUser = JSON.parse(localStorage.getItem(CONFIG.CURRENT_USER_KEY));
    showDashboard();
    
    // Auto-select active task if any exist today
    const userData = getUserData();
    const todayTasks = getTodayTasks(userData);
    if (todayTasks.length > 0) {
        appState.activeTaskId = todayTasks[0].id;
    }

    updateUI();
    loadMotivation();
}

/**
 * Setup all DOM event listeners
 */
function setupEventListeners() {
    // Auth events
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.signupForm.addEventListener('submit', handleSignup);
    DOM.logoutBtn.addEventListener('click', handleLogout);

    // Timer events
    DOM.startBtn.addEventListener('click', startTimer);
    DOM.pauseBtn.addEventListener('click', pauseTimer);
    DOM.resumeBtn.addEventListener('click', resumeTimer);
    DOM.stopBtn.addEventListener('click', stopTimer);
    DOM.resetBtn.addEventListener('click', resetTimer);

    // Task management events
    DOM.addTaskBtn.addEventListener('click', () => openTaskModal());
    if (DOM.copyYesterdayBtn) {
        DOM.copyYesterdayBtn.addEventListener('click', copyYesterdayTasks);
    }
    DOM.closeModalBtn.addEventListener('click', closeTaskModal);
    DOM.cancelTaskBtn.addEventListener('click', closeTaskModal);
    DOM.taskForm.addEventListener('submit', handleTaskFormSubmit);

    // Theme toggle
    DOM.themToggle.addEventListener('click', toggleTheme);

    // Motivation
    DOM.newMotivationBtn.addEventListener('click', loadMotivation);
}

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================

function checkAuth() {
    const currentUser = localStorage.getItem(CONFIG.CURRENT_USER_KEY);
    if (!currentUser) {
        clearAllSessionData();
        showAuthScreen();
        history.replaceState(null, '', window.location.href);
        return false;
    }
    return true;
}

function redirectToLogin() {
    localStorage.removeItem(CONFIG.CURRENT_USER_KEY);
    clearAllSessionData();
    showAuthScreen();

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();

    history.replaceState(null, '', window.location.href);
}

function clearAllSessionData() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
    appState.currentUser = null;
    appState.timerRunning = false;
    appState.timerPaused = false;
    appState.sessionStartTime = null;
    appState.sessionPausedTime = 0;
    appState.activeTaskId = null;
}

function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const users = JSON.parse(localStorage.getItem(CONFIG.USERS_KEY) || '{}');

    if (users[username] && users[username].password === password) {
        appState.currentUser = { username, name: users[username].name };
        localStorage.setItem(CONFIG.CURRENT_USER_KEY, JSON.stringify(appState.currentUser));

        showNotification('✅ Welcome back!', 'success');
        history.replaceState(null, '', window.location.href);
        
        // Auto select active task if exists
        const userData = getUserData();
        const todayTasks = getTodayTasks(userData);
        if (todayTasks.length > 0) {
            appState.activeTaskId = todayTasks[0].id;
        } else {
            appState.activeTaskId = null;
        }

        showDashboard();
        updateUI();
    } else {
        showNotification('❌ Invalid username or password', 'error');
    }
}

function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if (!name || !username || !password) {
        showNotification('❌ Please fill in all required fields', 'error');
        return;
    }

    if (password !== confirm) {
        showNotification('❌ Passwords do not match', 'error');
        return;
    }

    if (password.length < 4) {
        showNotification('❌ Password must be at least 4 characters', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem(CONFIG.USERS_KEY) || '{}');
    if (users[username]) {
        showNotification('❌ Username already exists', 'error');
        return;
    }

    users[username] = { name, email, password };
    localStorage.setItem(CONFIG.USERS_KEY, JSON.stringify(users));

    initializeUserData(username);

    appState.currentUser = { username, name };
    localStorage.setItem(CONFIG.CURRENT_USER_KEY, JSON.stringify(appState.currentUser));

    showNotification('✅ Account created! Welcome!', 'success');
    history.replaceState(null, '', window.location.href);

    showDashboard();
    updateUI();
}

function handleLogout() {
    redirectToLogin();
    showNotification('👋 You have been logged out', 'success');
}

// ==========================================
// DATE & USER DATA HELPERS
// ==========================================

function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function initializeUserData(username) {
    const userData = {
        username,
        createdAt: new Date().toISOString(),
        dailyTasks: {}, // Format: { "YYYY-MM-DD": [ { id, name, targetSeconds, studiedSeconds, completed } ] }
        dailyHistory: {}, // Format: { "YYYY-MM-DD": { seconds: 0, achieved: false } }
        streakData: {
            current: 0,
            best: 0,
            lastStudyDate: null,
        },
        totalSeconds: 0,
    };

    localStorage.setItem(`user_${username}`, JSON.stringify(userData));
}

function getUserData() {
    if (!appState.currentUser) return null;

    const key = `user_${appState.currentUser.username}`;
    const data = localStorage.getItem(key);

    if (!data) {
        initializeUserData(appState.currentUser.username);
        return JSON.parse(localStorage.getItem(key));
    }

    const parsed = JSON.parse(data);
    if (!parsed.dailyTasks) parsed.dailyTasks = {};
    if (!parsed.dailyHistory) parsed.dailyHistory = {};
    if (!parsed.streakData) parsed.streakData = { current: 0, best: 0, lastStudyDate: null };

    return parsed;
}

function saveUserData(userData) {
    if (!appState.currentUser) return;
    const key = `user_${appState.currentUser.username}`;
    localStorage.setItem(key, JSON.stringify(userData));
}

function getTodayTasks(userData) {
    if (!userData) userData = getUserData();
    if (!userData) return [];
    const today = getTodayString();
    return userData.dailyTasks[today] || [];
}

// ==========================================
// TASK MANAGEMENT
// ==========================================

function openTaskModal(task = null) {
    if (task) {
        DOM.modalTitle.textContent = 'Edit Task';
        DOM.taskId.value = task.id;
        DOM.taskName.value = task.name;
        DOM.targetHours.value = Math.floor(task.targetSeconds / 3600);
        DOM.targetMinutes.value = Math.floor((task.targetSeconds % 3600) / 60);
    } else {
        DOM.modalTitle.textContent = 'Add New Task';
        DOM.taskId.value = '';
        DOM.taskName.value = '';
        DOM.targetHours.value = 1;
        DOM.targetMinutes.value = 0;
    }
    DOM.taskModal.classList.add('active');
    DOM.taskName.focus();
}

function closeTaskModal() {
    DOM.taskModal.classList.remove('active');
    DOM.taskForm.reset();
}

function handleTaskFormSubmit(e) {
    e.preventDefault();

    const taskId = DOM.taskId.value;
    const name = DOM.taskName.value.trim();
    const hours = parseInt(DOM.targetHours.value) || 0;
    const minutes = parseInt(DOM.targetMinutes.value) || 0;
    const totalTargetSeconds = (hours * 3600) + (minutes * 60);

    if (!name) {
        showNotification('❌ Task name cannot be empty', 'error');
        return;
    }

    if (totalTargetSeconds <= 0) {
        showNotification('❌ Target duration must be greater than 0', 'error');
        return;
    }

    const userData = getUserData();
    const today = getTodayString();

    if (!userData.dailyTasks[today]) {
        userData.dailyTasks[today] = [];
    }

    const tasks = userData.dailyTasks[today];

    if (taskId) {
        // Edit Task
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].name = name;
            tasks[taskIndex].targetSeconds = totalTargetSeconds;
            tasks[taskIndex].completed = tasks[taskIndex].studiedSeconds >= totalTargetSeconds;
            showNotification('✅ Task updated!', 'success');
        }
    } else {
        // New Task
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: name,
            targetSeconds: totalTargetSeconds,
            studiedSeconds: 0,
            completed: false,
        };
        tasks.push(newTask);

        if (!appState.activeTaskId) {
            appState.activeTaskId = newTask.id;
        }

        showNotification('✅ Task added!', 'success');
    }

    saveUserData(userData);
    checkStreakCompletion(userData, today);
    closeTaskModal();
    updateUI();
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData.dailyTasks[today] || [];

    if (appState.activeTaskId === taskId) {
        if (appState.timerRunning) {
            clearInterval(appState.timerInterval);
            appState.timerInterval = null;
            appState.timerRunning = false;
            appState.timerPaused = false;
            appState.sessionStartTime = null;
            appState.sessionPausedTime = 0;
        }
        appState.activeTaskId = null;
    }

    userData.dailyTasks[today] = tasks.filter(t => t.id !== taskId);

    if (!appState.activeTaskId && userData.dailyTasks[today].length > 0) {
        appState.activeTaskId = userData.dailyTasks[today][0].id;
    }

    saveUserData(userData);
    checkStreakCompletion(userData, today);
    showNotification('🗑️ Task deleted', 'info');
    updateUI();
}

function copyYesterdayTasks() {
    const userData = getUserData();
    const yesterday = getYesterdayString();
    const today = getTodayString();

    const yesterdayTasks = userData.dailyTasks[yesterday] || [];
    if (yesterdayTasks.length === 0) {
        showNotification('ℹ️ No tasks found from yesterday to copy', 'info');
        return;
    }

    if (!userData.dailyTasks[today]) {
        userData.dailyTasks[today] = [];
    }

    yesterdayTasks.forEach(task => {
        userData.dailyTasks[today].push({
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: task.name,
            targetSeconds: task.targetSeconds,
            studiedSeconds: 0,
            completed: false,
        });
    });

    if (!appState.activeTaskId && userData.dailyTasks[today].length > 0) {
        appState.activeTaskId = userData.dailyTasks[today][0].id;
    }

    saveUserData(userData);
    checkStreakCompletion(userData, today);
    showNotification('📋 Yesterday\'s tasks copied for today!', 'success');
    updateUI();
}

function selectActiveTask(taskId) {
    if (appState.activeTaskId === taskId && appState.timerRunning) return;

    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData.dailyTasks[today] || [];
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    if (appState.timerRunning && appState.activeTaskId !== taskId) {
        const activeTask = tasks.find(t => t.id === appState.activeTaskId);
        const activeName = activeTask ? activeTask.name : 'Current task';

        // Auto-save running session for current task before switching
        const sessionSeconds = getSessionSeconds();
        if (sessionSeconds > 0) {
            saveSessionToTask(appState.activeTaskId, sessionSeconds);
            showNotification(`✅ Saved session for ${activeName}`, 'success');
        }
        resetTimerStateWithoutConfirm();
    }

    appState.activeTaskId = taskId;
    showNotification(`🎯 Selected task: ${targetTask.name}`, 'info');
    updateUI();
}

// ==========================================
// TIMER FUNCTIONS
// ==========================================

function startTimer() {
    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData.dailyTasks[today] || [];

    if (tasks.length === 0) {
        showNotification('❌ Please add at least one task first!', 'error');
        openTaskModal();
        return;
    }

    if (!appState.activeTaskId) {
        appState.activeTaskId = tasks[0].id;
    }

    if (appState.timerRunning && !appState.timerPaused) return;

    appState.timerRunning = true;
    appState.timerPaused = false;

    if (!appState.sessionStartTime) {
        appState.sessionStartTime = Date.now() - (appState.sessionPausedTime * 1000);
    }

    updateTimerButtons();
    playSound();
    updateActiveTaskBanner();

    if (!appState.timerInterval) {
        appState.timerInterval = setInterval(updateTimerDisplay, 100);
    }
}

function pauseTimer() {
    if (!appState.timerRunning) return;

    const currentElapsed = (Date.now() - appState.sessionStartTime) / 1000;
    appState.sessionPausedTime = Math.floor(currentElapsed);
    appState.timerPaused = true;

    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }

    updateTimerButtons();
    playSound();
    updateTimerDisplay();
}

function resumeTimer() {
    if (!appState.timerPaused) return;

    appState.sessionStartTime = Date.now() - (appState.sessionPausedTime * 1000);
    appState.timerPaused = false;

    if (!appState.timerInterval) {
        appState.timerInterval = setInterval(updateTimerDisplay, 100);
    }

    updateTimerButtons();
    playSound();
}

function stopTimer() {
    if (!appState.timerRunning && appState.sessionPausedTime === 0) return;

    const sessionSeconds = getSessionSeconds();

    if (sessionSeconds > 0 && appState.activeTaskId) {
        saveSessionToTask(appState.activeTaskId, sessionSeconds);
        showNotification('✅ Session saved to task!', 'success');
    }

    resetTimerStateWithoutConfirm();
    updateUI();
}

function resetTimer() {
    if (confirm('Reset the current session timer? (Unsaved session time will be lost)')) {
        resetTimerStateWithoutConfirm();
        updateTimerDisplay();
        playSound();
    }
}

function resetTimerStateWithoutConfirm() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
    appState.timerRunning = false;
    appState.timerPaused = false;
    appState.sessionStartTime = null;
    appState.sessionPausedTime = 0;
    updateTimerButtons();
    updateActiveTaskBanner();
}

function getSessionSeconds() {
    if (!appState.sessionStartTime) return appState.sessionPausedTime;
    if (appState.timerPaused) return appState.sessionPausedTime;

    const elapsed = (Date.now() - appState.sessionStartTime) / 1000;
    return Math.floor(elapsed);
}

function saveSessionToTask(taskId, seconds) {
    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData.dailyTasks[today] || [];
    const task = tasks.find(t => t.id === taskId);

    if (task) {
        task.studiedSeconds += seconds;
        if (task.studiedSeconds >= task.targetSeconds) {
            task.completed = true;
        }

        const totalTodayStudied = tasks.reduce((acc, t) => acc + t.studiedSeconds, 0);

        if (!userData.dailyHistory[today]) {
            userData.dailyHistory[today] = { seconds: 0, achieved: false };
        }
        userData.dailyHistory[today].seconds = totalTodayStudied;

        recalculateTotalSeconds(userData);
        checkStreakCompletion(userData, today);
        saveUserData(userData);
    }
}

function recalculateTotalSeconds(userData) {
    let total = 0;
    for (const dateStr in userData.dailyHistory) {
        total += userData.dailyHistory[dateStr].seconds || 0;
    }
    userData.totalSeconds = total;
}

// ==========================================
// STREAK MANAGEMENT
// ==========================================

function checkStreakCompletion(userData, todayString) {
    const todayTasks = userData.dailyTasks[todayString] || [];
    const totalTasks = todayTasks.length;
    const completedTasks = todayTasks.filter(t => t.completed).length;

    if (!userData.dailyHistory[todayString]) {
        userData.dailyHistory[todayString] = { seconds: 0, achieved: false };
    }

    // Streak day is successful when ALL created tasks for that day are completed
    const isAchieved = totalTasks > 0 && completedTasks === totalTasks;
    userData.dailyHistory[todayString].achieved = isAchieved;

    recalculateStreak(userData);
    saveUserData(userData);
}

function recalculateStreak(userData) {
    const history = userData.dailyHistory || {};
    const todayStr = getTodayString();
    const yesterdayStr = getYesterdayString();

    let currentStreak = 0;
    let bestStreak = userData.streakData ? (userData.streakData.best || 0) : 0;

    let checkDate = new Date();
    let lastDate = null;

    // Check starting from today or yesterday
    if (history[todayStr] && history[todayStr].achieved) {
        currentStreak = 1;
        lastDate = todayStr;
        checkDate.setDate(checkDate.getDate() - 1);
    } else {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (history[dateStr] && history[dateStr].achieved) {
            currentStreak++;
            if (!lastDate) lastDate = dateStr;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
    }

    userData.streakData = {
        current: currentStreak,
        best: bestStreak,
        lastStudyDate: lastDate,
    };
}

// ==========================================
// UI UPDATE & DISPLAY RENDERERS
// ==========================================

function updateTimerDisplay() {
    const sessionSeconds = getSessionSeconds();
    const sessionTime = formatTime(sessionSeconds);

    DOM.sessionDisplay.textContent = sessionTime;
    DOM.bigTimer.textContent = sessionTime;

    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData ? (userData.dailyTasks[today] || []) : [];
    const totalStudied = tasks.reduce((acc, t) => acc + t.studiedSeconds, 0);
    const liveTotal = totalStudied + (appState.timerRunning ? sessionSeconds : 0);

    DOM.todayDisplay2.textContent = formatTime(liveTotal);

    // Update active task progress live
    renderTasks();
    updateDailyTaskSummary();
}

function updateTimerButtons() {
    const running = appState.timerRunning;
    const paused = appState.timerPaused;
    const hasSession = getSessionSeconds() > 0;

    DOM.startBtn.disabled = running && !paused;
    DOM.pauseBtn.disabled = paused || !running;
    DOM.resumeBtn.disabled = !paused;
    DOM.stopBtn.disabled = !running && !paused;
    DOM.resetBtn.disabled = !hasSession && !running;
}

function renderTasks() {
    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData ? (userData.dailyTasks[today] || []) : [];
    const yesterdayTasks = userData ? (userData.dailyTasks[getYesterdayString()] || []) : [];

    DOM.taskDateBadge.textContent = today;

    if (DOM.copyYesterdayBtn) {
        if (tasks.length === 0 && yesterdayTasks.length > 0) {
            DOM.copyYesterdayBtn.style.display = 'inline-flex';
        } else {
            DOM.copyYesterdayBtn.style.display = 'none';
        }
    }

    if (tasks.length === 0) {
        DOM.tasksList.innerHTML = `
            <div class="empty-tasks-state">
                <span class="empty-tasks-icon">📝</span>
                <p class="empty-tasks-title">No tasks added for today.</p>
                <p class="empty-tasks-sub">Create your daily tasks with target study times to start tracking your progress.</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="btn btn-primary" onclick="openTaskModal()">+ Add Task</button>
                    ${yesterdayTasks.length > 0 ? '<button class="btn btn-secondary" onclick="copyYesterdayTasks()">📋 Copy Yesterday\'s Tasks</button>' : ''}
                </div>
            </div>
        `;
        return;
    }

    if (!appState.activeTaskId && tasks.length > 0) {
        appState.activeTaskId = tasks[0].id;
    }

    DOM.tasksList.innerHTML = tasks.map(task => {
        const isActive = appState.activeTaskId === task.id;
        const isCompleted = task.completed;
        
        const liveSeconds = isActive && appState.timerRunning ? getSessionSeconds() : 0;
        const totalDisplaySeconds = task.studiedSeconds + liveSeconds;
        const progressPercent = Math.min(100, Math.round((totalDisplaySeconds / task.targetSeconds) * 100));

        let statusClass = 'not-started';
        let statusText = '0%';
        if (isCompleted) {
            statusClass = 'completed';
            statusText = '✅ Completed';
        } else if (totalDisplaySeconds > 0) {
            statusClass = 'in-progress';
            statusText = `${progressPercent}%`;
        }

        return `
            <div class="task-item ${isActive ? 'active-task' : ''} ${isCompleted ? 'completed-task' : ''}" data-id="${task.id}">
                <div class="task-item-header">
                    <div class="task-item-title">
                        <span>${isActive ? '🎯' : (isCompleted ? '✅' : '📌')}</span>
                        <span>${escapeHtml(task.name)}</span>
                    </div>
                    <span class="task-status-badge ${statusClass}">${statusText}</span>
                </div>

                <div class="task-item-details">
                    <div class="task-time-metrics">
                        <div class="task-metric">
                            <span class="task-metric-label">Target:</span>
                            <span class="task-metric-value">${formatHours(task.targetSeconds)}</span>
                        </div>
                        <div class="task-metric">
                            <span class="task-metric-label">Studied:</span>
                            <span class="task-metric-value">${formatTime(totalDisplaySeconds)}</span>
                        </div>
                    </div>
                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--primary);">
                        ${progressPercent}%
                    </div>
                </div>

                <div class="task-progress-wrapper">
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                </div>

                <div class="task-item-actions">
                    ${isActive && appState.timerRunning ? `
                        <button class="btn btn-small btn-success" disabled>▶️ Timing Active</button>
                    ` : `
                        <button class="btn btn-small ${isActive ? 'btn-primary' : 'btn-secondary'}" onclick="handleStartTaskClick('${task.id}')">
                            ${isActive ? '▶️ Start / Resume' : '▶️ Start Timer'}
                        </button>
                    `}
                    <button class="btn btn-small btn-secondary" onclick="handleEditTaskClick('${task.id}')">✏️ Edit</button>
                    <button class="btn btn-small btn-danger" onclick="handleDeleteTaskClick('${task.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateActiveTaskBanner() {
    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData ? (userData.dailyTasks[today] || []) : [];
    const activeTask = tasks.find(t => t.id === appState.activeTaskId);

    if (activeTask) {
        DOM.activeTaskName.textContent = activeTask.name;
        if (appState.timerRunning) {
            DOM.activeTaskBanner.classList.add('running');
        } else {
            DOM.activeTaskBanner.classList.remove('running');
        }
    } else {
        DOM.activeTaskName.textContent = 'No task selected — Pick a task below to start';
        DOM.activeTaskBanner.classList.remove('running');
    }
}

function updateDailyTaskSummary() {
    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData ? (userData.dailyTasks[today] || []) : [];
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;

    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    DOM.taskCompletionCount.textContent = `${completedCount} / ${totalCount} Tasks Completed`;
    DOM.taskCompletionPercent.textContent = `${percent}%`;
    DOM.taskProgressFill.style.width = `${percent}%`;

    if (totalCount > 0 && completedCount === totalCount) {
        DOM.completionBanner.style.display = 'block';
    } else {
        DOM.completionBanner.style.display = 'none';
    }
}

function updateUI() {
    if (!appState.currentUser) return;

    const userData = getUserData();
    const today = getTodayString();

    DOM.userGreeting.textContent = `Hi, ${appState.currentUser.name}! 👋`;

    DOM.currentStreak.textContent = userData.streakData.current;
    DOM.bestStreak.textContent = userData.streakData.best;
    DOM.lifetimeTotal.textContent = formatHours(userData.totalSeconds);

    const tasks = userData.dailyTasks[today] || [];
    const totalStudiedSeconds = tasks.reduce((acc, t) => acc + t.studiedSeconds, 0);
    const liveSeconds = appState.timerRunning ? getSessionSeconds() : 0;
    const grandTotalToday = totalStudiedSeconds + liveSeconds;

    const weekTotal = calculateWeekTotal(userData);
    DOM.weekTotal.textContent = formatHours(weekTotal + liveSeconds);
    DOM.todayDisplay.textContent = `Today: ${formatHours(grandTotalToday)}`;

    const yesterdaySeconds = (userData.dailyHistory[getYesterdayString()] || {}).seconds || 0;
    const bestDay = findBestDay(userData.dailyHistory || {});

    DOM.todayTracking.textContent = formatTime(grandTotalToday);
    DOM.yesterdayTracking.textContent = formatTime(yesterdaySeconds);
    DOM.weekTracking.textContent = formatTime(weekTotal + liveSeconds);
    DOM.bestDayTracking.textContent = formatTime(bestDay.seconds);

    renderTasks();
    updateDailyTaskSummary();
    updateActiveTaskBanner();
    updateChart(userData);
    updateTimerDisplay();
}

function updateChart(userData) {
    const dailyHistory = userData.dailyHistory || {};
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const seconds = dailyHistory[dateStr]?.seconds || 0;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        days.push({ date: dateStr, dayName, seconds });
    }

    const maxSeconds = Math.max(...days.map(d => d.seconds), 3600);

    DOM.studyChart.innerHTML = days.map(day => {
        const height = (day.seconds / maxSeconds) * 100;
        return `
            <div class="chart-bar" style="height: ${height}%;" title="${day.dayName}: ${formatTime(day.seconds)}">
                <div class="chart-bar-value">${formatHours(day.seconds, true)}</div>
                <div class="chart-bar-label">${day.dayName}</div>
            </div>
        `;
    }).join('');
}

function calculateWeekTotal(userData) {
    const dailyHistory = userData.dailyHistory || {};
    let total = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        total += dailyHistory[dateStr]?.seconds || 0;
    }

    return total;
}

function findBestDay(dailyHistory) {
    let bestDay = { seconds: 0, date: null };

    for (const [date, data] of Object.entries(dailyHistory)) {
        if (data.seconds > bestDay.seconds) {
            bestDay = { seconds: data.seconds, date };
        }
    }

    return bestDay;
}

// ==========================================
// HTML EVENT HANDLERS
// ==========================================

function handleStartTaskClick(taskId) {
    selectActiveTask(taskId);
    if (!appState.timerRunning) {
        startTimer();
    }
}

function handleEditTaskClick(taskId) {
    const userData = getUserData();
    const today = getTodayString();
    const tasks = userData.dailyTasks[today] || [];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        openTaskModal(task);
    }
}

function handleDeleteTaskClick(taskId) {
    deleteTask(taskId);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

// ==========================================
// MOTIVATION SYSTEM
// ==========================================

function loadMotivation() {
    const random = Math.floor(Math.random() * CONFIG.MOTIVATIONS.length);
    DOM.motivationText.textContent = CONFIG.MOTIVATIONS[random];
}

// ==========================================
// UI SCREEN SWITCHING
// ==========================================

function showAuthScreen() {
    DOM.dashboard.style.display = 'none';
    DOM.loginScreen.classList.add('active');
    DOM.signupScreen.classList.remove('active');
}

function showDashboard() {
    DOM.dashboard.style.display = 'block';
    DOM.loginScreen.classList.remove('active');
    DOM.signupScreen.classList.remove('active');
}

function switchToSignup(e) {
    e.preventDefault();
    DOM.loginScreen.classList.remove('active');
    DOM.signupScreen.classList.add('active');
    document.getElementById('loginForm').reset();
}

function switchToLogin(e) {
    e.preventDefault();
    DOM.signupScreen.classList.remove('active');
    DOM.loginScreen.classList.add('active');
    document.getElementById('signupForm').reset();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [hours, minutes, secs]
        .map(val => String(val).padStart(2, '0'))
        .join(':');
}

function formatHours(seconds, short = false) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (short) {
        return hours > 0 ? `${hours}h` : `${minutes}m`;
    }

    if (hours === 0 && minutes === 0) {
        return '0h 0m';
    }

    return `${hours}h ${minutes}m`;
}

function playSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const now = audioContext.currentTime;
        oscillator.frequency.value = 800;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        oscillator.start(now);
        oscillator.stop(now + 0.1);
    } catch (e) {
        console.debug('Audio not available');
    }
}

function showNotification(message, type = 'info') {
    DOM.notification.textContent = message;
    DOM.notification.className = `notification show ${type}`;

    setTimeout(() => {
        DOM.notification.classList.remove('show');
    }, 3000);
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(CONFIG.DARK_MODE_KEY, isDark);
    DOM.themToggle.textContent = isDark ? '☀️' : '🌙';
}

function loadTheme() {
    const isDark = localStorage.getItem(CONFIG.DARK_MODE_KEY) === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        DOM.themToggle.textContent = '☀️';
    }
}

// ==========================================
// START APPLICATION & PAGE LIFECYCLE
// ==========================================

window.addEventListener('load', initializeApp);

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && appState.currentUser) {
        if (!checkAuth()) {
            redirectToLogin();
            showNotification('⚠️ Your session has ended. Please login again.', 'error');
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (appState.currentUser && appState.timerRunning) {
        const sessionSeconds = getSessionSeconds();
        if (sessionSeconds > 0 && appState.activeTaskId) {
            saveSessionToTask(appState.activeTaskId, sessionSeconds);
        }
    }
});