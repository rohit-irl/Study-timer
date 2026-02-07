// ====================================
// DSA Study Timer & Progress Tracker
// ====================================

// ========================
// STATE & CONFIGURATION
// ========================
const config = {
    STORAGE_KEY_TIMER: 'dsaStudyTimer',
    STORAGE_KEY_PROBLEMS: 'dsaProblems',
    STORAGE_KEY_DAILY: 'dsaDailyStats',
    STORAGE_KEY_GOAL: 'dsaDailyGoal',
    STORAGE_KEY_STREAK: 'dsaStreak',
    HOUR_ALERT_INTERVAL: 3600000, // 1 hour in milliseconds
};

// Motivational messages
const motivations = [
    '💡 Keep going! Every problem solved is a step towards mastery.',
    '🚀 You\'re making progress! Consistency is key.',
    '🎯 Another problem solved, you\'re getting closer to your goal!',
    '💪 Great effort! DSA mastery takes time and dedication.',
    '✨ You\'ve got this! Keep pushing forward.',
    '🏆 Every expert was once a beginner. Keep learning!',
    '⚡ Speed up your progress with consistent practice.',
    '🌟 Your dedication is impressive. Keep it up!',
];

// ========================
// TIMER STATE
// ========================
let timerState = {
    isRunning: false,
    isPaused: false,
    sessionSeconds: 0,
    totalTodaySeconds: 0,
    startTime: null,
    pauseTime: null,
    pausedSeconds: 0,
    lastHourAlert: 0,
};

let timerInterval = null;

// ========================
// DOM ELEMENTS
// ========================
const elements = {
    // Timer
    timerDisplay: document.getElementById('timerDisplay'),
    sessionTime: document.getElementById('sessionTime'),
    totalTodayTime: document.getElementById('totalTodayTime'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    resetBtn: document.getElementById('resetBtn'),
    dailyGoalInput: document.getElementById('dailyGoalInput'),
    setGoalBtn: document.getElementById('setGoalBtn'),

    // Stats
    totalStudyTime: document.getElementById('totalStudyTime'),
    problemsSolved: document.getElementById('problemsSolved'),
    streakCount: document.getElementById('streakCount'),
    goalProgress: document.getElementById('goalProgress'),
    goalPercentage: document.getElementById('goalPercentage'),

    // Problems
    problemForm: document.getElementById('problemForm'),
    problemName: document.getElementById('problemName'),
    problemDifficulty: document.getElementById('problemDifficulty'),
    problemStatus: document.getElementById('problemStatus'),
    problemsList: document.getElementById('problemsList'),
    easyCount: document.getElementById('easyCount'),
    mediumCount: document.getElementById('mediumCount'),
    hardCount: document.getElementById('hardCount'),
    exportBtn: document.getElementById('exportBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),

    // Theme
    themToggle: document.getElementById('themToggle'),

    // Motivation
    motivationalMessage: document.getElementById('motivationalMessage'),
};

// ========================
// INITIALIZATION
// ========================
function init() {
    loadState();
    setupEventListeners();
    updateUIFromState();
    setRandomMotivation();
    
    // Start timer update loop
    updateTimerDisplay();
}

// ========================
// EVENT LISTENERS
// ========================
function setupEventListeners() {
    // Timer controls
    elements.startBtn.addEventListener('click', startTimer);
    elements.pauseBtn.addEventListener('click', pauseTimer);
    elements.resumeBtn.addEventListener('click', resumeTimer);
    elements.resetBtn.addEventListener('click', resetTimer);
    elements.setGoalBtn.addEventListener('click', setDailyGoal);

    // Problems
    elements.problemForm.addEventListener('submit', handleAddProblem);
    elements.exportBtn.addEventListener('click', exportAsJSON);
    elements.clearAllBtn.addEventListener('click', clearAllProblems);

    // Theme
    elements.themToggle.addEventListener('click', toggleTheme);

    // Update motivation every 5 minutes
    setInterval(setRandomMotivation, 5 * 60 * 1000);
}

// ========================
// TIMER FUNCTIONS
// ========================

/**
 * Start the study timer from zero
 */
function startTimer() {
    if (timerState.isRunning) return;

    timerState.isRunning = true;
    timerState.isPaused = false;
    timerState.startTime = Date.now() - (timerState.pausedSeconds * 1000);
    timerState.pauseTime = null;

    updateButtonStates();

    // Start the interval
    if (!timerInterval) {
        timerInterval = setInterval(updateTimerDisplay, 100);
    }

    // Play sound effect (optional)
    playSound('start');
}

/**
 * Pause the current timer
 */
function pauseTimer() {
    if (!timerState.isRunning || timerState.isPaused) return;

    timerState.isPaused = true;
    timerState.pauseTime = Date.now();

    updateButtonStates();
    playSound('pause');
}

/**
 * Resume the paused timer
 */
function resumeTimer() {
    if (!timerState.isPaused) return;

    timerState.isPaused = false;
    const pausedDuration = (Date.now() - timerState.pauseTime) / 1000;
    timerState.startTime += pausedDuration * 1000;
    timerState.pauseTime = null;

    updateButtonStates();
    playSound('start');
}

/**
 * Reset the timer (only current session)
 */
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;

    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.sessionSeconds = 0;
    timerState.pausedSeconds = 0;
    timerState.startTime = null;
    timerState.pauseTime = null;

    updateButtonStates();
    updateTimerDisplay();
    saveState();
    playSound('reset');
}

/**
 * Update the timer display - called frequently
 */
function updateTimerDisplay() {
    if (timerState.isRunning && !timerState.isPaused) {
        const elapsedMs = Date.now() - timerState.startTime;
        timerState.sessionSeconds = Math.floor(elapsedMs / 1000);
    }

    // Calculate today's total (if it's a new day, reset)
    checkAndResetDaily();

    timerState.totalTodaySeconds += timerState.sessionSeconds;

    // Format and display times
    const sessionDisplay = formatTime(timerState.sessionSeconds);
    const totalDisplay = formatTime(timerState.totalTodaySeconds);

    elements.timerDisplay.textContent = sessionDisplay;
    elements.sessionTime.textContent = sessionDisplay;
    elements.totalTodayTime.textContent = totalDisplay;
    elements.totalStudyTime.textContent = formatTotalTime(timerState.totalTodaySeconds);

    // Update progress bar
    updateGoalProgress();

    // Save state frequently
    if (timerState.isRunning) {
        saveState();

        // Check for hour alert
        checkHourAlert();
    }
}

/**
 * Check if we should show hourly alert
 */
function checkHourAlert() {
    const lastAlert = timerState.lastHourAlert;
    const elapsed = timerState.sessionSeconds;

    if (elapsed > 0 && elapsed % config.HOUR_ALERT_INTERVAL === 0 && elapsed !== lastAlert) {
        timerState.lastHourAlert = elapsed;
        showHourAlert();
    }
}

/**
 * Show alert after 1 hour
 */
function showHourAlert() {
    playSound('alert');
    // Create visual alert
    const message = `🎉 Great job! You've studied for 1 hour. Keep up the momentum!`;
    showNotification(message);
}

/**
 * Set daily goal
 */
function setDailyGoal() {
    const goal = parseFloat(elements.dailyGoalInput.value);
    if (goal && goal > 0) {
        localStorage.setItem(config.STORAGE_KEY_GOAL, JSON.stringify({
            hours: goal,
            dateSet: new Date().toDateString(),
        }));
        updateGoalProgress();
        playSound('success');
        showNotification(`✅ Daily goal set to ${goal} hours!`);
    }
}

/**
 * Update progress bar toward daily goal
 */
function updateGoalProgress() {
    const goalData = JSON.parse(localStorage.getItem(config.STORAGE_KEY_GOAL) || '{}');
    const goalHours = goalData.hours || 5;
    const goalSeconds = goalHours * 3600;
    const progress = Math.min((timerState.totalTodaySeconds / goalSeconds) * 100, 100);

    elements.goalProgress.style.width = progress + '%';
    elements.goalPercentage.textContent = Math.round(progress) + '%';
}

/**
 * Check if it's a new day and reset daily stats
 */
function checkAndResetDaily() {
    const lastLogin = localStorage.getItem('lastLoginDate');
    const today = new Date().toDateString();

    if (lastLogin !== today) {
        // New day - reset session and update streak
        updateStreak();
        localStorage.setItem('lastLoginDate', today);
    }
}

/**
 * Update study streak
 */
function updateStreak() {
    const streakData = JSON.parse(localStorage.getItem(config.STORAGE_KEY_STREAK) || '{}');
    const lastStudyDate = streakData.lastDate;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastStudyDate === today) {
        // Already studied today
        return;
    }

    if (lastStudyDate === yesterday) {
        // Continuous streak
        streakData.count = (streakData.count || 1) + 1;
    } else {
        // Streak broken or new
        streakData.count = 1;
    }

    streakData.lastDate = today;
    localStorage.setItem(config.STORAGE_KEY_STREAK, JSON.stringify(streakData));
    elements.streakCount.textContent = streakData.count + ' days';
}

/**
 * Update button states based on timer state
 */
function updateButtonStates() {
    elements.startBtn.disabled = timerState.isRunning && !timerState.isPaused;
    elements.pauseBtn.disabled = !timerState.isRunning || timerState.isPaused;
    elements.resumeBtn.disabled = !timerState.isPaused;
    elements.resetBtn.disabled = timerState.sessionSeconds === 0;
}

// ========================
// PROBLEM TRACKING
// ========================

/**
 * Handle adding a new problem
 */
function handleAddProblem(e) {
    e.preventDefault();

    const problem = {
        id: Date.now(),
        name: elements.problemName.value.trim(),
        difficulty: elements.problemDifficulty.value,
        status: elements.problemStatus.value,
        dateAdded: new Date().toLocaleString(),
    };

    if (!problem.name) {
        showNotification('❌ Please enter a problem name');
        return;
    }

    const problems = getProblems();
    problems.push(problem);
    saveProblems(problems);

    // Reset form
    elements.problemForm.reset();
    updateProblemsList();
    updateStats();

    playSound('success');
    showNotification(`✅ "${problem.name}" added!`);
}

/**
 * Delete a problem
 */
function deleteProblem(id) {
    const problems = getProblems();
    const problem = problems.find(p => p.id === id);
    const filtered = problems.filter(p => p.id !== id);
    
    saveProblems(filtered);
    updateProblemsList();
    updateStats();

    playSound('delete');
    showNotification(`🗑️ "${problem.name}" removed`);
}

/**
 * Get all problems from storage
 */
function getProblems() {
    const data = localStorage.getItem(config.STORAGE_KEY_PROBLEMS);
    return data ? JSON.parse(data) : [];
}

/**
 * Save problems to storage
 */
function saveProblems(problems) {
    localStorage.setItem(config.STORAGE_KEY_PROBLEMS, JSON.stringify(problems));
}

/**
 * Update problems list display
 */
function updateProblemsList() {
    const problems = getProblems();

    if (problems.length === 0) {
        elements.problemsList.innerHTML = '<p class="empty-message">No problems added yet. Start tracking your progress! 🚀</p>';
        return;
    }

    elements.problemsList.innerHTML = problems.map(problem => `
        <div class="problem-item">
            <div class="problem-details">
                <div class="problem-name">${escapeHtml(problem.name)}</div>
                <div class="problem-meta">
                    <span class="problem-meta-item difficulty">${problem.difficulty}</span>
                    <span class="problem-meta-item status ${problem.status.toLowerCase()}">${problem.status}</span>
                    <span class="problem-meta-item" style="background: rgba(160, 174, 192, 0.2); color: #718096; font-size: 0.75rem;">
                        ${problem.dateAdded}
                    </span>
                </div>
            </div>
            <div class="problem-actions">
                <button class="btn-delete" onclick="deleteProblem(${problem.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Update statistics
 */
function updateStats() {
    const problems = getProblems();

    const solved = problems.filter(p => p.status === 'Solved').length;
    const easy = problems.filter(p => p.difficulty === 'Easy').length;
    const medium = problems.filter(p => p.difficulty === 'Medium').length;
    const hard = problems.filter(p => p.difficulty === 'Hard').length;

    elements.problemsSolved.textContent = solved;
    elements.easyCount.textContent = easy;
    elements.mediumCount.textContent = medium;
    elements.hardCount.textContent = hard;
}

/**
 * Clear all problems with confirmation
 */
function clearAllProblems() {
    if (confirm('Are you sure? This will delete all problems. This action cannot be undone.')) {
        saveProblems([]);
        updateProblemsList();
        updateStats();
        playSound('delete');
        showNotification('🗑️ All problems cleared');
    }
}

/**
 * Export problems as JSON
 */
function exportAsJSON() {
    const problems = getProblems();
    const stats = {
        totalStudyTime: timerState.totalTodaySeconds,
        totalSolved: problems.filter(p => p.status === 'Solved').length,
        difficulties: {
            easy: problems.filter(p => p.difficulty === 'Easy').length,
            medium: problems.filter(p => p.difficulty === 'Medium').length,
            hard: problems.filter(p => p.difficulty === 'Hard').length,
        },
        exportDate: new Date().toLocaleString(),
    };

    const data = {
        stats,
        problems,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    playSound('success');
    showNotification('📥 Progress exported successfully!');
}

// ========================
// STORAGE & PERSISTENCE
// ========================

/**
 * Save timer state to localStorage
 */
function saveState() {
    const state = {
        sessionSeconds: timerState.sessionSeconds,
        totalTodaySeconds: timerState.totalTodaySeconds,
        isRunning: timerState.isRunning,
        isPaused: timerState.isPaused,
        timestamp: Date.now(),
    };
    localStorage.setItem(config.STORAGE_KEY_TIMER, JSON.stringify(state));
}

/**
 * Load timer state from localStorage
 */
function loadState() {
    const saved = localStorage.getItem(config.STORAGE_KEY_TIMER);
    if (!saved) return;

    const state = JSON.parse(saved);
    const timeSinceLastSave = (Date.now() - state.timestamp) / 1000;

    // Check if it's a new day
    const lastLogin = localStorage.getItem('lastLoginDate');
    const today = new Date().toDateString();

    if (lastLogin !== today) {
        // New day - reset
        timerState.totalTodaySeconds = 0;
        localStorage.setItem('lastLoginDate', today);
    } else {
        timerState.totalTodaySeconds = state.totalTodaySeconds;
    }

    // If was running, apply the time that passed
    if (state.isRunning && !state.isPaused) {
        timerState.sessionSeconds = state.sessionSeconds + Math.floor(timeSinceLastSave);
        timerState.totalTodaySeconds += Math.floor(timeSinceLastSave);
    } else {
        timerState.sessionSeconds = state.sessionSeconds;
    }

    updateUIFromState();
}

/**
 * Update UI from current state
 */
function updateUIFromState() {
    updateButtonStates();
    updateStats();
    updateProblemsList();
    updateGoalProgress();

    const streakData = JSON.parse(localStorage.getItem(config.STORAGE_KEY_STREAK) || '{}');
    elements.streakCount.textContent = (streakData.count || 0) + ' days';
}

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs]
        .map(val => String(val).padStart(2, '0'))
        .join(':');
}

/**
 * Format total time in human readable format
 */
function formatTotalTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show notification message
 */
function showNotification(message) {
    // You can enhance this with a toast notification library
    console.log(message);
    
    // Simple implementation - update motivational message temporarily
    const original = elements.motivationalMessage.textContent;
    elements.motivationalMessage.textContent = message;
    
    setTimeout(() => {
        elements.motivationalMessage.textContent = original;
    }, 3000);
}

/**
 * Play sound effect (optional - uses Web Audio API)
 */
function playSound(type) {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const now = audioContext.currentTime;

        switch (type) {
            case 'start':
                oscillator.frequency.value = 800;
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                break;
            case 'pause':
                oscillator.frequency.value = 600;
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                break;
            case 'reset':
                oscillator.frequency.value = 400;
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                break;
            case 'success':
                oscillator.frequency.setValueAtTime(523, now);
                oscillator.frequency.setValueAtTime(659, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                break;
            case 'delete':
                oscillator.frequency.value = 300;
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                break;
            case 'alert':
                // Double beep for alert
                oscillator.frequency.setValueAtTime(880, now);
                oscillator.frequency.setValueAtTime(880, now + 0.1);
                oscillator.frequency.setValueAtTime(880, now + 0.2);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                break;
            default:
                break;
        }

        oscillator.start(now);
        oscillator.stop(now + 0.3);
    } catch (e) {
        // Audio API not available or permission denied
        console.debug('Audio not available');
    }
}

/**
 * Set random motivational message
 */
function setRandomMotivation() {
    const random = Math.floor(Math.random() * motivations.length);
    elements.motivationalMessage.textContent = motivations[random];
}

/**
 * Toggle dark mode
 */
function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    elements.themToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

/**
 * Load theme preference
 */
function loadTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        elements.themToggle.textContent = '☀️';
    }
}

// ========================
// START APPLICATION
// ========================
loadTheme();
init();