const { createServer } = require('./src/app');
const WebSocket = require('ws');

const port = process.env.PORT || 3000;

createServer().then(server => {
    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    process.on('SIGINT', () => {
        const { db } = require('./src/config/database');
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Closed the database connection.');
            process.exit(0);
        });
    });
}).catch(error => {
    console.error('Failed to create server:', error);
    process.exit(1);
});