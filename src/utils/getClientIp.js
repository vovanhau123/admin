const axios = require("axios");
const useragent = require("useragent");
const geoip = require("geoip-lite");

// Sử dụng Set để lưu trữ các IP đã gửi thông báo
const notifiedIPs = new Set();

async function getClientInfo(req) {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"];
  const agent = useragent.parse(userAgent);
  const geo = geoip.lookup(ip);

  const deviceInfo = `${agent.device.family} ${agent.device.major || ""} ${
    agent.device.minor || ""
  }`.trim();
  const browserInfo = `${agent.family} ${agent.major}.${agent.minor}.${agent.patch}`;
  const osInfo = `${agent.os.family} ${agent.os.major}.${agent.os.minor}`;

  const location = geo ? `${geo.city}, ${geo.country}` : "Unknown";
  const isp = geo ? geo.org : "Unknown";

  const info = {
    ip,
    device: deviceInfo,
    browser: browserInfo,
    os: osInfo,
    location,
    isp,
  };

  // Chỉ gửi thông báo nếu IP này chưa được thông báo trước đó
  if (!notifiedIPs.has(ip)) {
    await sendToDiscord(info);
    notifiedIPs.add(ip);
  }

  return info;
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    const publicIp = ips.find(
      (ip) =>
        !ip.startsWith("10.") &&
        !ip.startsWith("172.16.") &&
        !ip.startsWith("172.17.") &&
        !ip.startsWith("172.18.") &&
        !ip.startsWith("172.19.") &&
        !ip.startsWith("172.20.") &&
        !ip.startsWith("172.21.") &&
        !ip.startsWith("172.22.") &&
        !ip.startsWith("172.23.") &&
        !ip.startsWith("172.24.") &&
        !ip.startsWith("172.25.") &&
        !ip.startsWith("172.26.") &&
        !ip.startsWith("172.27.") &&
        !ip.startsWith("172.28.") &&
        !ip.startsWith("172.29.") &&
        !ip.startsWith("172.30.") &&
        !ip.startsWith("172.31.") &&
        !ip.startsWith("192.168.") &&
        ip !== "::1" &&
        ip !== "127.0.0.1"
    );
    if (publicIp) {
      return publicIp;
    }
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp && realIp !== "::1" && realIp !== "127.0.0.1") {
    return realIp;
  }

  const remoteAddress =
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;

  if (
    remoteAddress &&
    remoteAddress !== "::1" &&
    remoteAddress !== "127.0.0.1"
  ) {
    return remoteAddress;
  }

  return "Unknown";
}

async function sendToDiscord(info) {
  const webhookUrl = `https://discord.com/api/webhooks/1290035353553469531/MLva8kdBM-RRbYD8ObR8ina05af3G3Gu_f7Hxpm4aSNeIWfLE9k6R3shK127ksB0N01I`;

  // Làm sạch và kiểm tra dữ liệu
  const cleanInfo = Object.fromEntries(
    Object.entries(info).map(([key, value]) => [key, value || "Unknown"])
  );

  const message = {
    content: "New visitor to the web app!",
    embeds: [
      {
        title: "Visitor Information",
        fields: Object.entries(cleanInfo).map(([key, value]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: value,
          inline: true,
        })),
        color: 5814783, // A nice blue color
      },
    ],
  };

  try {
    const response = await axios.post(webhookUrl, message);
    console.log(
      "Message sent to Discord:",
      response.status,
      response.statusText
    );
  } catch (error) {
    console.error(
      "Error sending message to Discord:",
      error.response ? error.response.data : error.message
    );
    console.error("Full error object:", error);
    console.error(
      "Message that failed to send:",
      JSON.stringify(message, null, 2)
    );
  }
}

// Thêm hàm để xóa IP khỏi Set sau một khoảng thời gian
function clearNotifiedIP(ip) {
  setTimeout(() => {
    notifiedIPs.delete(ip);
  }, 30 * 60 * 1000); // Xóa IP sau 30 phút
}

module.exports = { getClientInfo, getClientIp, sendToDiscord };
