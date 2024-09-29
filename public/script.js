let scripts = [];

// Thêm hàm này vào đầu file
function fetchScriptList() {
    fetch('/api/scripts/list')
        .then(response => response.json())
        .then(data => {
            scripts = data;
            createLogContainers();
        })
        .catch(error => console.error('Error fetching script list:', error));
}

// Thay đổi hàm createLogContainers
function createLogContainers() {
    logsContainer.innerHTML = ''; // Clear existing containers
    scripts.forEach(script => {
        const container = createLogContainer(script);
        logsContainer.appendChild(container);
    });
}

// Gọi fetchScriptList khi trang web được load
document.addEventListener('DOMContentLoaded', fetchScriptList);

const scriptButtons = document.getElementById('scriptButtons');
const logsContainer = document.getElementById('logsContainer');
const logsTabs = document.getElementById('logsTabs');
const logsContent = document.getElementById('logsContent');
const modal = document.getElementById('scheduleModal');
const closeBtn = document.getElementsByClassName('close')[0];
const datetimePicker = document.getElementById('datetimePicker');
const scheduleButton = document.getElementById('scheduleButton');
let currentScriptName = '';
let currentAction = '';
let currentLogScript = null;

flatpickr(datetimePicker, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    minDate: "today",
    time_24hr: true,
    defaultHour: new Date().getHours(),
    defaultMinute: new Date().getMinutes()
});

const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);

socket.onopen = function() {
    console.log('WebSocket connection established');
};


socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'scriptStatus') {
        updateButtons(data.data);
    } else if (data.type === 'logs') {
        updateLogs(data.scriptName, data.data);
    } else if (data.type === 'logCountdown') {
        updateCountdown(data.scriptName, data.countdown);
    }
};

socket.onerror = function(error) {
    console.error('WebSocket error:', error);
    showToast('Error connecting to server. Please check your connection and try again.', true);
};

socket.onclose = function(event) {
    console.log('WebSocket connection closed:', event);
    showToast('Connection to server lost. Attempting to reconnect...', true);
    setTimeout(() => {
        location.reload();
    }, 5000);
};

function createButton(script, status) {
    const card = document.createElement('div');
    card.className = 'script-card';
    card.dataset.script = script;

    const startButton = document.createElement('button');
    startButton.className = 'start';
    startButton.innerHTML = `
        <div class="spinner"></div>
        <span>${status.isRunning ? 'Running' : 'Start'}</span>
    `;
    startButton.onclick = status.isRunning ? null : () => startScript(script, startButton);
    startButton.classList.toggle('running', status.isRunning);

    const restartButton = document.createElement('button');
    restartButton.className = 'restart';
    restartButton.textContent = 'Restart';
    restartButton.onclick = () => restartScript(script);

    const stopButton = document.createElement('button');
    stopButton.className = 'stop';
    stopButton.textContent = 'Stop';
    stopButton.onclick = () => stopScript(script);

    const scheduleRestartButton = document.createElement('button');
    scheduleRestartButton.className = 'schedule';
    
    if (status.scheduledTime) {
        scheduleRestartButton.classList.add('active');
        const countdown = document.createElement('div');
        countdown.className = 'countdown';
        scheduleRestartButton.appendChild(countdown);
        updateCountdown(countdown, status.scheduledTime);
        
        scheduleRestartButton.onmouseover = () => {
            scheduleRestartButton.textContent = 'Hủy Restart';
        };
        scheduleRestartButton.onmouseout = () => {
            scheduleRestartButton.textContent = '';
            scheduleRestartButton.appendChild(countdown);
        };
        scheduleRestartButton.onclick = () => cancelScheduledAction(script);
    } else {
        scheduleRestartButton.textContent = 'Schedule Restart';
        scheduleRestartButton.onclick = () => openScheduleModal(script, 'restart');
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.textContent = script;

    card.appendChild(startButton);
    card.appendChild(restartButton);
    card.appendChild(stopButton);
    card.appendChild(scheduleRestartButton);
    card.appendChild(statusDiv);
    return card;
}

function updateButtons(statuses) {
    scriptButtons.innerHTML = '';
    Object.entries(statuses).forEach(([script, status]) => {
        const button = createButton(script, status);
        scriptButtons.appendChild(button);
    });
}

const logsContainers = {};
const countdownIntervals = {};

const logsOrder = ['discord', 'role', 'index', 'music-bot'];

function createLogContainers() {
    logsContainer.innerHTML = ''; // Clear existing containers
    scripts.forEach(script => {
        const container = createLogContainer(script);
        logsContainer.appendChild(container);
    });
}

function createLogContainer(scriptName) {
    const container = document.createElement('div');
    container.className = 'log-container';
    container.innerHTML = `
        <h3>${scriptName} Logs</h3>
        <div class="countdown" style="display: none;">Next update in: <span>5</span>s</div>
        <pre class="logs-content"></pre>
    `;
    logsContainers[scriptName] = {
        content: container.querySelector('.logs-content'),
        countdown: container.querySelector('.countdown'),
        countdownSpan: container.querySelector('.countdown span')
    };
    return container;
}

function updateLogs(scriptName, logs) {
    if (logsContainers[scriptName]) {
        if (logs.trim() === '') {
            logsContainers[scriptName].content.textContent = 'No logs';
        } else {
            logsContainers[scriptName].content.textContent = logs;
        }
        logsContainers[scriptName].content.scrollTop = logsContainers[scriptName].content.scrollHeight;
    }
}

function updateCountdown(scriptName, countdown) {
    if (countdownIntervals[scriptName]) {
        clearInterval(countdownIntervals[scriptName]);
    }
    
    const countdownElement = logsContainers[scriptName].countdown;
    const countdownSpan = logsContainers[scriptName].countdownSpan;
    countdownElement.style.display = 'block';
    countdownSpan.textContent = countdown;

    countdownIntervals[scriptName] = setInterval(() => {
        countdown--;
        countdownSpan.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownIntervals[scriptName]);
            countdownElement.style.display = 'none';
        }
    }, 1000);
}

function showToast(message, isError = false) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: isError ? "#ff6b6b" : "#51cf66",
        className: "info",
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
        }
    }).showToast();
}

function updateButton(scriptName, isRunning) {
    const card = document.querySelector(`.script-card[data-script="${scriptName}"]`);
    if (card) {
        const startButton = card.querySelector('.start');
        if (startButton) {
            const span = startButton.querySelector('span');
            if (span) {
                span.textContent = isRunning ? 'Running' : 'Start';
            }
            startButton.classList.toggle('running', isRunning);
            startButton.onclick = isRunning ? null : () => startScript(scriptName, startButton);
        }
    }
}

function checkScriptStatus(scriptName) {
    fetch(`/api/scripts/status/${scriptName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateButton(scriptName, data[scriptName]);
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(`Failed to check status for ${scriptName}`, true);
        });
}

function performAction(scriptName, action) {
    return fetch(`/api/scripts/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptName }),
    })
    .then(response => response.json())
    .then(data => {
        showToast(data.message);
        return checkScriptStatus(scriptName);
    })
    .catch(error => {
        showToast(`Failed to ${action} script`, true);
        console.error('Error:', error);
    });
}

function startScript(scriptName, button) {
    button.classList.add('loading');
    updateButton(scriptName, true);
    performAction(scriptName, 'start')
        .then(() => {
            button.classList.remove('loading');
        })
        .catch(() => {
            updateButton(scriptName, false);
            button.classList.remove('loading');
        });
}

function restartScript(scriptName) {
    updateButton(scriptName, false);
    performAction(scriptName, 'restart');
}

function stopScript(scriptName) {
    updateButton(scriptName, false);
    performAction(scriptName, 'stop');
}

function openScheduleModal(scriptName, action) {
    currentScriptName = scriptName;
    currentAction = action;
    modal.style.display = "block";
}

closeBtn.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

scheduleButton.onclick = function() {
    const selectedDateTime = datetimePicker.value;
    if (selectedDateTime) {
        scheduleAction(currentScriptName, currentAction, selectedDateTime);
        modal.style.display = "none";
    } else {
        showToast("Please select a date and time", true);
    }
}

function scheduleAction(scriptName, action, time) {
    const localTime = new Date(time);
    const isoTime = localTime.toISOString();
    fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptName, action, time: isoTime }),
    })
    .then(response => response.json())
    .then(data => {
        showToast(data.message);
        updateButtons(data.updatedStatuses);
    })
    .catch(error => showToast(`Failed to schedule ${action}`, true));
}

function cancelScheduledAction(scriptName) {
    fetch('/api/schedules/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptName }),
    })
    .then(response => response.json())
    .then(data => {
        showToast(data.message);
        updateButtons(data.updatedStatuses);
    })
    .catch(error => showToast('Failed to cancel scheduled action', true));
}

function checkConnection() {
    if (socket.readyState !== WebSocket.OPEN) {
        showToast('Reconnecting to server...', true);
        socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);
    }
}

setInterval(checkConnection, 30000);

function getRestartHistory() {
    fetch('/api/schedules/history')
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // Implement the logic to display restart history
    })
    .catch(error => console.error('Error fetching restart history:', error));
}

function getScheduledActions() {
    fetch('/api/schedules')
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // Implement the logic to display scheduled actions
    })
    .catch(error => console.error('Error fetching scheduled actions:', error));
}

function updateCountdown(element, targetTime) {
    const updateTimer = () => {
        const now = new Date().getTime();
        const distance = new Date(targetTime).getTime() - now;
        
        if (distance < 0) {
            clearInterval(element.timerInterval);
            element.textContent = 'Restarting...';
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        element.textContent = `${hours}h ${minutes}m ${seconds}s`;
    };

    updateTimer();
    if (element.timerInterval) {
        clearInterval(element.timerInterval);
    }
    element.timerInterval = setInterval(updateTimer, 1000);
}

// Khởi tạo containers cho logs
createLogContainers();