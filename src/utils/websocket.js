const { getScriptStatuses } = require("../services/scriptService");
const { spawn } = require("child_process");

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

    // Start log processes for all scripts
    Object.keys(getScriptStatuses()).forEach(scriptName => {
      const logsProcess = spawn("pm2", ["logs", scriptName, "--raw", "--lines", "100"]);
      logProcesses[scriptName] = logsProcess;
      logsProcess.stdout.on("data", (data) => {
        ws.send(JSON.stringify({ type: "logs", scriptName: scriptName, data: data.toString() }));
      });
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
