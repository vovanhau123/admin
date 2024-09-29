const axios = require("axios");
const useragent = require("useragent");
const geoip = require("geoip-lite");

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

  // Send to Discord
  await sendToDiscord(info);

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
  const webhookUrl = ``;
  const message = {
    content: 'New visitor to the web app!',
    embeds: [{
      title: 'Visitor Information',
      fields: [
        { name: 'IP', value: info.ip, inline: true },
        { name: 'Device', value: info.device, inline: true },
        { name: 'Browser', value: info.browser, inline: true },
        { name: 'OS', value: info.os, inline: true },
        { name: 'Location', value: info.location, inline: true },
        { name: 'ISP', value: info.isp, inline: true },
      ],
      color: 5814783  // A nice blue color
    }]
  };

  try {
    const response = await axios.post(webhookUrl, message);
    console.log('Message sent to Discord:', response.status, response.statusText);
  } catch (error) {
    console.error('Error sending message to Discord:', error.response ? error.response.data : error.message);
  }
}

module.exports = { getClientInfo, getClientIp, sendToDiscord };
