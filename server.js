const { createServer } = require('./src/app');
const WebSocket = require('ws');
const { setupWebSocket } = require('./src/utils/websocket');

const port = process.env.PORT || 3000;

createServer().then(server => {
    const wss = new WebSocket.Server({ server });

    setupWebSocket(wss);

    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
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