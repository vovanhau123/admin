const { getScriptStatuses, getScriptList } = require("../services/scriptService");
const { spawn } = require("child_process");

const LOG_INTERVAL = 5000; // 5 giây, đơn vị milliseconds
const MAX_LOG_LINES = 10; // Số dòng logs tối đa cho mỗi script

function setupWebSocket(wss) {
  wss.on("connection", (ws) => {
    console.log('New WebSocket connection');

    getScriptStatuses().then((statuses) => {
      ws.send(JSON.stringify({ type: "scriptStatus", data: statuses }));
    });

    const intervalId = setInterval(async () => {
      try {
        const statuses = await getScriptStatuses();
        ws.send(JSON.stringify({ type: "scriptStatus", data: statuses }));
      } catch (error) {
        console.error("Error getting script statuses:", error);
      }
    }, 5000);

    const logProcesses = {};
    const scripts = getScriptList();

    scripts.forEach(scriptName => {
      const logsProcess = spawn("pm2", ["logs", scriptName, "--raw", "--lines", MAX_LOG_LINES.toString()]);
      logProcesses[scriptName] = logsProcess;
      
      let buffer = '';
      let lastSendTime = Date.now();

      const sendLogs = () => {
        const now = Date.now();
        if (now - lastSendTime >= LOG_INTERVAL) {
          ws.send(JSON.stringify({ type: "logCountdown", scriptName: scriptName, countdown: LOG_INTERVAL / 1000 }));
          if (buffer.trim() !== '') {
            const logLines = buffer.split('\n').slice(-MAX_LOG_LINES).join('\n');
            ws.send(JSON.stringify({ type: "logs", scriptName: scriptName, data: logLines }));
            buffer = '';
          }
          lastSendTime = now;
        }
      };

      logsProcess.stdout.on("data", (data) => {
        buffer += data.toString();
        sendLogs();
      });

      logsProcess.stderr.on("data", (data) => {
        buffer += data.toString();
        sendLogs();
      });

      // Đảm bảo gửi logs và cập nhật đếm ngược ngay cả khi không có logs mới
      setInterval(sendLogs, 1000);
    });

    ws.on("error", (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on("close", () => {
      clearInterval(intervalId);
      Object.values(logProcesses).forEach(process => process.kill());
    });
  });
}

module.exports = { setupWebSocket };
