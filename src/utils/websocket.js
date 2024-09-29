const { getScriptStatuses } = require("../services/scriptService");
const { spawn } = require("child_process");

function setupWebSocket(wss) {
  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

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

    ws.on("message", (message) => {
      const data = JSON.parse(message);
      if (data.type === "requestLogs") {
        if (logProcesses[data.scriptName]) {
          logProcesses[data.scriptName].kill();
        }
        const logsProcess = spawn("pm2", [
          "logs",
          data.scriptName,
          "--raw",
          "--lines",
          "100",
        ]);
        logProcesses[data.scriptName] = logsProcess;
        logsProcess.stdout.on("data", (data) => {
          ws.send(
            JSON.stringify({
              type: "logs",
              scriptName: data.scriptName,
              data: data.toString(),
            })
          );
        });
      } else if (data.type === "stopLogs") {
        if (logProcesses[data.scriptName]) {
          logProcesses[data.scriptName].kill();
          delete logProcesses[data.scriptName];
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    ws.on("close", () => {
      clearInterval(intervalId);
      Object.values(logProcesses).forEach((process) => process.kill());
    });
  });
}

module.exports = { setupWebSocket };
