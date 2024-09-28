const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../restart_logs.db'));

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const initDatabase = async () => {
    try {
        await dbRun(`CREATE TABLE IF NOT EXISTS restart_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            script_name TEXT,
            restart_time TEXT,
            ip_address TEXT,
            success INTEGER
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scriptName TEXT,
            action TEXT,
            scheduledTime TEXT,
            createdAt TEXT,
            ipAddress TEXT
        )`);

        // Kiểm tra xem cột ipAddress đã tồn tại trong bảng schedules chưa
        const checkColumn = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(schedules)", (err, rows) => {
                if (err) reject(err);
                resolve(rows.some(row => row.name === 'ipAddress'));
            });
        });

        if (!checkColumn) {
            await dbRun(`ALTER TABLE schedules ADD COLUMN ipAddress TEXT`);
            console.log('Added ipAddress column to schedules table');
        }

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
};

module.exports = { db, dbRun, initDatabase };