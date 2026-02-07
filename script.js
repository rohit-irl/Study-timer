// ==========================================
// SMART STUDY TIMER WITH AUTHENTICATION
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
    MIN_STUDY_FOR_STREAK: 30 * 60, // 30 minutes in seconds
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
 * Global state
 */
let appState = {
    currentUser: null,
    timerRunning: false,
    timerPaused: false,
    sessionStartTime: null,
    sessionPausedTime: 0,
    timerInterval: null,
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

    // Logout
    logoutBtn: document.getElementById('logoutBtn'),
    userGreeting: document.getElementById('userGreeting'),

    // Stats
    currentStreak: document.getElementById('currentStreak'),
    bestStreak: document.getElementById('bestStreak'),
    lifetimeTotal: document.getElementById('lifetimeTotal'),
    weekTotal: document.getElementById('weekTotal'),

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

    // Goal
    goalHours: document.getElementById('goalHours'),
    setGoalBtn: document.getElementById('setGoalBtn'),
    progressFill: document.getElementById('progressFill'),
    goalPercent: document.getElementById('goalPercent'),

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
    checkUserSession();
    loadMotivation();
}

/**
 * Setup all event listeners
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

    // Goal event
    DOM.setGoalBtn.addEventListener('click', setDailyGoal);

    // Theme toggle
    DOM.themToggle.addEventListener('click', toggleTheme);

    // Motivation
    DOM.newMotivationBtn.addEventListener('click', loadMotivation);
}

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================

/**
 * Check if user is already logged in
 */
function checkUserSession() {
    const currentUser = localStorage.getItem(CONFIG.CURRENT_USER_KEY);
    if (currentUser) {
        appState.currentUser = JSON.parse(currentUser);
        showDashboard();
        updateUI();
    }
}

/**
 * Handle login submission
 */
function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Get all users from storage
    const users = JSON.parse(localStorage.getItem(CONFIG.USERS_KEY) || '{}');

    // Check if user exists and password matches
    if (users[username] && users[username].password === password) {
        appState.currentUser = { username, name: users[username].name };
        localStorage.setItem(CONFIG.CURRENT_USER_KEY, JSON.stringify(appState.currentUser));
        showNotification('✅ Welcome back!', 'success');
        showDashboard();
        updateUI();
    } else {
        showNotification('❌ Invalid username or password', 'error');
    }
}

/**
 * Handle signup submission
 */
function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    // Validation
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

    // Check if username already exists
    const users = JSON.parse(localStorage.getItem(CONFIG.USERS_KEY) || '{}');
    if (users[username]) {
        showNotification('❌ Username already exists', 'error');
        return;
    }

    // Create new user
    users[username] = { name, email, password };
    localStorage.setItem(CONFIG.USERS_KEY, JSON.stringify(users));

    // Initialize user data
    initializeUserData(username);

    // Auto-login
    appState.currentUser = { username, name };
    localStorage.setItem(CONFIG.CURRENT_USER_KEY, JSON.stringify(appState.currentUser));

    showNotification('✅ Account created! Welcome!', 'success');
    showDashboard();
    updateUI();
}

/**
 * Initialize new user data structure
 */
function initializeUserData(username) {
    const userData = {
        username,
        createdAt: new Date().toISOString(),
        dailyHistory: {}, // Format: { "YYYY-MM-DD": { seconds: 0, achieved: false } }
        streakData: {
            current: 0,
            best: 0,
            lastStudyDate: null,
        },
        goal: {
            hours: 4,
            setDate: new Date().toDateString(),
        },
        totalSeconds: 0,
    };

    localStorage.setItem(`user_${username}`, JSON.stringify(userData));
}

/**
 * Handle logout
 */
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(CONFIG.CURRENT_USER_KEY);
        appState.currentUser = null;
        resetTimer();
        showAuthScreen();
        showNotification('👋 You have been logged out', 'success');
    }
}

// ==========================================
// TIMER FUNCTIONS
// ==========================================

/**
 * Start or resume timer
 */
function startTimer() {
    if (appState.timerRunning && !appState.timerPaused) return;

    appState.timerRunning = true;
    appState.timerPaused = false;

    if (!appState.sessionStartTime) {
        appState.sessionStartTime = Date.now() - (appState.sessionPausedTime * 1000);
    }

    updateTimerButtons();
    playSound();

    if (!appState.timerInterval) {
        appState.timerInterval = setInterval(updateTimerDisplay, 100);
    }
}

/**
 * Pause timer
 */
function pauseTimer() {
    if (!appState.timerRunning) return;

    appState.timerPaused = true;
    updateTimerButtons();
    playSound();
}

/**
 * Resume paused timer
 */
function resumeTimer() {
    if (!appState.timerPaused) return;

    appState.timerPaused = false;
    updateTimerButtons();
    playSound();
}

/**
 * Stop timer and save elapsed time
 */
function stopTimer() {
    if (!appState.timerRunning) return;

    const sessionSeconds = getSessionSeconds();

    // Save to user data
    if (sessionSeconds > 0) {
        addSessionToHistory(sessionSeconds);
    }

    resetTimer();
    showNotification('✅ Session saved!', 'success');
}

/**
 * Reset timer
 */
function resetTimer() {
    if (confirm('Reset the current session timer?')) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
        appState.timerRunning = false;
        appState.timerPaused = false;
        appState.sessionStartTime = null;
        appState.sessionPausedTime = 0;

        updateTimerButtons();
        updateTimerDisplay();
        playSound();
    }
}

/**
 * Get current session time in seconds
 */
function getSessionSeconds() {
    if (!appState.sessionStartTime) return appState.sessionPausedTime;

    if (appState.timerPaused) {
        return appState.sessionPausedTime;
    }

    const elapsed = (Date.now() - appState.sessionStartTime) / 1000;
    return Math.floor(elapsed);
}

/**
 * Add session to daily history and update streaks
 */
function addSessionToHistory(seconds) {
    const userData = getUserData();
    const today = new Date().toISOString().split('T')[0];

    // Add to daily history
    if (!userData.dailyHistory[today]) {
        userData.dailyHistory[today] = { seconds: 0, achieved: false };
    }
    userData.dailyHistory[today].seconds += seconds;

    // Update total
    userData.totalSeconds += seconds;

    // Check streak
    const dailySeconds = userData.dailyHistory[today].seconds;
    if (dailySeconds >= CONFIG.MIN_STUDY_FOR_STREAK) {
        userData.dailyHistory[today].achieved = true;
        updateStreak(userData, today);
    }

    saveUserData(userData);
    updateUI();
}

/**
 * Update streak logic
 */
function updateStreak(userData, todayString) {
    const today = new Date(todayString);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const streakData = userData.streakData;

    if (streakData.lastStudyDate === yesterdayString) {
        // Continuous streak
        streakData.current += 1;
    } else if (streakData.lastStudyDate !== todayString) {
        // New streak or streak broken
        streakData.current = 1;
    }

    streakData.lastStudyDate = todayString;

    // Update best streak
    if (streakData.current > streakData.best) {
        streakData.best = streakData.current;
    }
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const sessionSeconds = getSessionSeconds();
    const sessionTime = formatTime(sessionSeconds);

    DOM.sessionDisplay.textContent = sessionTime;
    DOM.bigTimer.textContent = sessionTime;

    // Update today's total
    const userData = getUserData();
    const today = new Date().toISOString().split('T')[0];
    const dailyHistory = userData.dailyHistory[today] || { seconds: 0 };
    const totalToday = dailyHistory.seconds + (appState.timerRunning ? sessionSeconds : 0);
    DOM.todayDisplay2.textContent = formatTime(totalToday);

    // Update progress
    updateGoalProgress(userData, totalToday);
}

/**
 * Update timer button states
 */
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

/**
 * Set daily goal
 */
function setDailyGoal() {
    const hours = parseFloat(DOM.goalHours.value);

    if (!hours || hours <= 0) {
        showNotification('❌ Please enter a valid goal', 'error');
        return;
    }

    const userData = getUserData();
    userData.goal = {
        hours,
        setDate: new Date().toDateString(),
    };
    saveUserData(userData);

    showNotification(`✅ Goal set to ${hours} hours`, 'success');
    updateUI();
}

/**
 * Update progress bar toward daily goal
 */
function updateGoalProgress(userData, todaySeconds) {
    const goalSeconds = userData.goal.hours * 3600;
    const progress = Math.min((todaySeconds / goalSeconds) * 100, 100);

    DOM.progressFill.style.width = progress + '%';
    DOM.goalPercent.textContent = Math.round(progress) + '%';
}

// ==========================================
// USER DATA MANAGEMENT
// ==========================================

/**
 * Get current user's data
 */
function getUserData() {
    if (!appState.currentUser) return null;

    const key = `user_${appState.currentUser.username}`;
    const data = localStorage.getItem(key);

    if (!data) {
        initializeUserData(appState.currentUser.username);
        return JSON.parse(localStorage.getItem(key));
    }

    return JSON.parse(data);
}

/**
 * Save current user's data
 */
function saveUserData(userData) {
    if (!appState.currentUser) return;

    const key = `user_${appState.currentUser.username}`;
    localStorage.setItem(key, JSON.stringify(userData));
}

// ==========================================
// UI UPDATE FUNCTIONS
// ==========================================

/**
 * Update all UI elements
 */
function updateUI() {
    if (!appState.currentUser) return;

    const userData = getUserData();
    const today = new Date().toISOString().split('T')[0];
    const dailyHistory = userData.dailyHistory || {};

    // Update greeting
    DOM.userGreeting.textContent = `Hi, ${appState.currentUser.name}! 👋`;

    // Update stats
    DOM.currentStreak.textContent = userData.streakData.current;
    DOM.bestStreak.textContent = userData.streakData.best;
    DOM.lifetimeTotal.textContent = formatHours(userData.totalSeconds);

    // Calculate this week
    const weekTotal = calculateWeekTotal(userData);
    DOM.weekTotal.textContent = formatHours(weekTotal);
    DOM.todayDisplay.textContent = `Today: ${formatHours(dailyHistory[today]?.seconds || 0)}`;

    // Update tracking
    const todaySeconds = dailyHistory[today]?.seconds || 0;
    const yesterdaySeconds = dailyHistory[getYesterdayString()]?.seconds || 0;
    const bestDay = findBestDay(dailyHistory);

    DOM.todayTracking.textContent = formatTime(todaySeconds);
    DOM.yesterdayTracking.textContent = formatTime(yesterdaySeconds);
    DOM.weekTracking.textContent = formatTime(weekTotal);
    DOM.bestDayTracking.textContent = formatTime(bestDay.seconds);

    // Restore goal
    DOM.goalHours.value = userData.goal.hours;

    // Update chart
    updateChart(userData);

    // Update timer display
    updateTimerDisplay();
}

/**
 * Update 7-day study chart
 */
function updateChart(userData) {
    const dailyHistory = userData.dailyHistory;
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const seconds = dailyHistory[dateStr]?.seconds || 0;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        days.push({ date: dateStr, dayName, seconds });
    }

    // Find max for scaling
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

/**
 * Calculate total seconds studied this week
 */
function calculateWeekTotal(userData) {
    const dailyHistory = userData.dailyHistory;
    let total = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        total += dailyHistory[dateStr]?.seconds || 0;
    }

    return total;
}

/**
 * Find best day with most study time
 */
function findBestDay(dailyHistory) {
    let bestDay = { seconds: 0, date: null };

    for (const [date, data] of Object.entries(dailyHistory)) {
        if (data.seconds > bestDay.seconds) {
            bestDay = { seconds: data.seconds, date };
        }
    }

    return bestDay;
}

/**
 * Get yesterday's date string
 */
function getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

// ==========================================
// MOTIVATION SYSTEM
// ==========================================

/**
 * Load random motivation message
 */
function loadMotivation() {
    const random = Math.floor(Math.random() * CONFIG.MOTIVATIONS.length);
    DOM.motivationText.textContent = CONFIG.MOTIVATIONS[random];
}

// ==========================================
// UI SCREEN SWITCHING
// ==========================================

/**
 * Show authentication screens
 */
function showAuthScreen() {
    DOM.dashboard.style.display = 'none';
    DOM.loginScreen.classList.add('active');
    DOM.signupScreen.classList.remove('active');
}

/**
 * Show dashboard
 */
function showDashboard() {
    DOM.dashboard.style.display = 'block';
    DOM.loginScreen.classList.remove('active');
    DOM.signupScreen.classList.remove('active');
}

/**
 * Switch to signup screen
 */
function switchToSignup(e) {
    e.preventDefault();
    DOM.loginScreen.classList.remove('active');
    DOM.signupScreen.classList.add('active');
    document.getElementById('loginForm').reset();
}

/**
 * Switch to login screen
 */
function switchToLogin(e) {
    e.preventDefault();
    DOM.signupScreen.classList.remove('active');
    DOM.loginScreen.classList.add('active');
    document.getElementById('signupForm').reset();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs]
        .map(val => String(Math.floor(val)).padStart(2, '0'))
        .join(':');
}

/**
 * Format seconds to hours with abbreviation
 */
function formatHours(seconds, short = false) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (short) {
        return hours > 0 ? `${hours}h` : `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
}

/**
 * Play notification sound
 */
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

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    DOM.notification.textContent = message;
    DOM.notification.className = `notification show ${type}`;

    setTimeout(() => {
        DOM.notification.classList.remove('show');
    }, 3000);
}

/**
 * Toggle dark mode
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(CONFIG.DARK_MODE_KEY, isDark);
    DOM.themToggle.textContent = isDark ? '☀️' : '🌙';
}

/**
 * Load theme preference
 */
function loadTheme() {
    const isDark = localStorage.getItem(CONFIG.DARK_MODE_KEY) === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        DOM.themToggle.textContent = '☀️';
    }
}

// ==========================================
// START APPLICATION
// ==========================================
window.addEventListener('load', initializeApp);

// Save state on page unload
window.addEventListener('beforeunload', () => {
    if (appState.currentUser && appState.timerRunning) {
        // Session automatically resumes on next load
        appState.sessionPausedTime = getSessionSeconds();
    }
});