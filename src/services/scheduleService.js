const schedule = require('node-schedule');
const moment = require('moment-timezone');
const { db } = require('../config/database');
const { getClientIp } = require('../utils/getClientIp');
const { scripts, scriptStatusCache } = require('./scriptService');
const pm2 = require('pm2-promise');

const scheduledJobs = {};

function scheduleJob(scriptName, action, scheduledTime, ipAddress) {
    const job = schedule.scheduleJob(new Date(scheduledTime), async function() {
        console.log(`Executing scheduled ${action} for ${scriptName}`);
        try {
            if (action === 'restart') {
                await pm2.restart(scriptName);
            } else if (action === 'stop') {
                await pm2.stop(scriptName);
            }
            console.log(`Successfully executed ${action} for ${scriptName}`);
            
            delete scheduledJobs[scriptName];
            db.run('DELETE FROM schedules WHERE scriptName = ?', [scriptName]);
            
            scriptStatusCache.del(scriptName);
            
            const vietnamTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
            db.run('INSERT INTO restart_logs (script_name, restart_time, ip_address, success) VALUES (?, ?, ?, ?)', 
                [scriptName, vietnamTime, ipAddress, 1], 
                (err) => {
                    if (err) {
                        console.error('Error inserting restart log:', err);
                    }
                }
            );
        } catch (error) {
            console.error(`Error executing scheduled ${action} for ${scriptName}:`, error);
            const vietnamTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
            db.run('INSERT INTO restart_logs (script_name, restart_time, ip_address, success) VALUES (?, ?, ?, ?)', 
                [scriptName, vietnamTime, ipAddress, 0], 
                (err) => {
                    if (err) {
                        console.error('Error inserting failed restart log:', err);
                    }
                }
            );
        }
    });
    
    scheduledJobs[scriptName] = job;
}

function restoreSchedules() {
    db.all('SELECT * FROM schedules', [], (err, rows) => {
        if (err) {
            console.error('Error restoring schedules:', err);
            return;
        }
        rows.forEach(row => {
            if (new Date(row.scheduledTime) > new Date()) {
                scheduleJob(row.scriptName, row.action, row.scheduledTime, row.ipAddress);
            } else {
                db.run('DELETE FROM schedules WHERE id = ?', [row.id]);
            }
        });
    });
}

async function scheduleAction(req, res) {
    console.log('Received schedule action request:', req.body);
    const { scriptName, action, time } = req.body;
    const ipAddress = getClientIp(req);
    
    if (scripts[scriptName]) {
        const scheduledTime = new Date(time).toISOString();
        
        if (scheduledJobs[scriptName]) {
            scheduledJobs[scriptName].cancel();
        }
        
        scheduleJob(scriptName, action, scheduledTime, ipAddress);
        
        db.run('INSERT OR REPLACE INTO schedules (scriptName, action, scheduledTime, createdAt, ipAddress) VALUES (?, ?, ?, ?, ?)', 
            [scriptName, action, scheduledTime, new Date().toISOString(), ipAddress],
            (err) => {
                if (err) {
                    console.error('Error saving schedule:', err);
                    return res.status(500).json({ error: 'Failed to save schedule' });
                }
                res.json({ message: `Scheduled ${action} for ${scriptName} at ${new Date(scheduledTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (Vietnam time)` });
            }
        );
    } else {
        res.status(404).json({ error: 'Script not found' });
    }
}

function cancelScheduledAction(req, res) {
    const { scriptName } = req.body;
    
    if (scheduledJobs[scriptName]) {
        scheduledJobs[scriptName].cancel();
        delete scheduledJobs[scriptName];
        
        db.run('DELETE FROM schedules WHERE scriptName = ?', [scriptName], (err) => {
            if (err) {
                console.error('Error deleting schedule:', err);
                return res.status(500).json({ error: 'Failed to delete schedule' });
            }
            res.json({ message: `Cancelled scheduled action for ${scriptName}` });
        });
    } else {
        res.status(404).json({ error: 'No scheduled action found for this script' });
    }
}

function getScheduledActions(req, res) {
    db.all('SELECT * FROM schedules', [], (err, rows) => {
        if (err) {
            console.error('Error fetching schedules:', err);
            return res.status(500).json({ error: 'Failed to fetch schedules' });
        }
        res.json(rows);
    });
}

function getRestartHistory(req, res) {
    db.all('SELECT * FROM restart_logs', [], (err, rows) => {
        if (err) {
            console.error('Error fetching restart history:', err);
            res.status(500).json({ error: 'Failed to fetch restart history' });
        } else {
            const formattedRows = rows.map(row => ({
                ...row,
                restart_time: moment(row.restart_time).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
            }));
            res.json(formattedRows);
        }
    });
}

module.exports = {
    scheduleAction,
    cancelScheduledAction,
    getScheduledActions,
    getRestartHistory,
    restoreSchedules
};