const pm2 = require('pm2-promise');
const { spawn } = require('child_process');
const { db } = require('../config/database');
const moment = require('moment-timezone');
const { getClientIp } = require('../utils/getClientIp');
const NodeCache = require('node-cache');

const scriptStatusCache = new NodeCache({ stdTTL: 2, checkperiod: 5 });

const scripts = {
    'discord': '/home/vovanhau/disscord/index.js',
    'index': '/home/vovanhau/index.js',
    'role': '/home/vovanhau/TICK_cow/role.js',
    'music-bot': '/home/vovanhau/bot/Discord-MusicBot-5/index.js'
};

async function checkScriptStatus(scriptName) {
    const cachedStatus = scriptStatusCache.get(scriptName);
    if (cachedStatus !== undefined) {
        return cachedStatus;
    }

    try {
        const list = await pm2.list();
        const scriptProcess = list.find(p => p.name === scriptName);
        const status = scriptProcess ? scriptProcess.pm2_env.status === 'online' : false;
        scriptStatusCache.set(scriptName, status);
        return status;
    } catch (err) {
        console.error(`Error checking status for ${scriptName}:`, err);
        return false;
    }
}

async function getScriptStatuses() {
    const statuses = {};
    for (const name of Object.keys(scripts)) {
        statuses[name] = await checkScriptStatus(name);
    }
    return statuses;
}

async function getScriptStatus(req, res) {
    const { scriptName } = req.params;
    try {
        const status = await checkScriptStatus(scriptName);
        res.json({ [scriptName]: status });
    } catch (error) {
        console.error(`Error checking status for ${scriptName}:`, error);
        res.status(500).json({ error: 'Failed to check script status' });
    }
}

async function getAllScriptStatuses(req, res) {
    try {
        const statuses = await getScriptStatuses();
        res.json(statuses);
    } catch (error) {
        console.error('Error checking script statuses:', error);
        res.status(500).json({ error: 'Failed to check script statuses' });
    }
}

async function startScript(req, res) {
    const { scriptName } = req.body;
    if (scripts[scriptName]) {
        try {
            await pm2.start({ script: scripts[scriptName], name: scriptName });
            scriptStatusCache.del(scriptName);
            res.json({ message: `Script ${scriptName} started successfully` });
        } catch (error) {
            console.error(`Error starting script ${scriptName}:`, error);
            res.status(500).json({ error: 'Failed to start script' });
        }
    } else {
        res.status(404).json({ error: 'Script not found' });
    }
}

async function restartScript(req, res) {
    const { scriptName } = req.body;
    const ipAddress = getClientIp(req);
    if (scripts[scriptName]) {
        try {
            await pm2.restart(scriptName);
            scriptStatusCache.del(scriptName);

            const vietnamTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
            db.run('INSERT INTO restart_logs (script_name, restart_time, ip_address, success) VALUES (?, ?, ?, ?)', 
                [scriptName, vietnamTime, ipAddress, 1], 
                (err) => {
                    if (err) {
                        console.error('Error inserting new restart log:', err);
                    }
                }
            );

            res.json({ message: `Script ${scriptName} restarted successfully` });
        } catch (error) {
            console.error(`Error restarting script ${scriptName}:`, error);
            
            const vietnamTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
            db.run('INSERT INTO restart_logs (script_name, restart_time, ip_address, success) VALUES (?, ?, ?, ?)', 
                [scriptName, vietnamTime, ipAddress, 0], 
                (err) => {
                    if (err) {
                        console.error('Error inserting failed restart log:', err);
                    }
                }
            );
            
            res.status(500).json({ error: 'Failed to restart script' });
        }
    } else {
        res.status(404).json({ error: 'Script not found' });
    }
}

async function stopScript(req, res) {
    const { scriptName } = req.body;
    if (scripts[scriptName]) {
        try {
            await pm2.stop(scriptName);
            scriptStatusCache.del(scriptName);
            res.json({ message: `Script ${scriptName} stopped successfully` });
        } catch (error) {
            console.error(`Error stopping script ${scriptName}:`, error);
            res.status(500).json({ error: 'Failed to stop script' });
        }
    } else {
        res.status(404).json({ error: 'Script not found' });
    }
}

function getPM2Logs(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const pm2Logs = spawn('pm2', ['logs', '--lines', '100', '--raw']);

    pm2Logs.stdout.on('data', (data) => {
        res.write(data);
    });

    pm2Logs.stderr.on('data', (data) => {
        res.write(data);
    });

    pm2Logs.on('close', (code) => {
        res.end();
    });

    req.on('close', () => {
        pm2Logs.kill();
    });
}

module.exports = {
    getScriptStatus,
    getAllScriptStatuses,
    startScript,
    restartScript,
    stopScript,
    getPM2Logs,
    checkScriptStatus,
    getScriptStatuses,
    scripts,
    scriptStatusCache
};