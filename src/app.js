const express = require("express");
const http = require("http");
const path = require("path");
const { initDatabase } = require("./config/database");
const scriptRoutes = require("./routes/scriptRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const { restoreSchedules } = require("./services/scheduleService");
const { getClientInfo, sendToDiscord } = require("./utils/getClientIp");

function createServer() {
  const app = express();

  app.use(express.json());

  // Middleware để gửi thông tin người dùng đến Discord cho mọi request
  app.use(async (req, res, next) => {
    if (req.headers["x-forwarded-proto"] === "https") {
      req.secure = true;
    }
    
    try {
      const clientInfo = await getClientInfo(req);
      console.log('Client info:', clientInfo);
      await sendToDiscord(clientInfo);
    } catch (error) {
      console.error('Error getting client info or sending to Discord:', error);
    }
    
    next();
  });

  app.use(express.static(path.join(__dirname, '../public')));
  app.use("/api/scripts", scriptRoutes);
  app.use("/api/schedules", scheduleRoutes);

  return initDatabase()
    .then(() => {
      restoreSchedules();
      const server = http.createServer(app);
      return server;
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    });
}

module.exports = { createServer };
