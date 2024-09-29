const express = require("express");
const http = require("http");
const path = require("path");
const { initDatabase } = require("./config/database");
const scriptRoutes = require("./routes/scriptRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const { restoreSchedules } = require("./services/scheduleService");

function createServer() {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] === "https") {
      req.secure = true;
    }
    next();
  });

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
