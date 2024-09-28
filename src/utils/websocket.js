const { getScriptStatuses } = require("../services/scriptService");
const { spawn } = require("child_process");

function setupWebSocket(wss) {
  wss.on("connection", (ws) => {
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

    const logsProcess = spawn("pm2", ["logs", "--raw"]);
    logsProcess.stdout.on("data", (data) => {
      ws.send(JSON.stringify({ type: "logs", data: data.toString() }));
    });

    ws.on("close", () => {
      clearInterval(intervalId);
      logsProcess.kill();
    });
  });
}

module.exports = { setupWebSocket };
