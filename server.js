const http = require('http');
const app = require('./app');
const port = 3000;
const cors = require('cors');

// Import or define your MySQL connection here
const connection = require('./database'); // Assuming you have a 'database.js' file that exports the connection

const server = http.createServer(app);

app.use(cors());

// Start the server
server.listen(port, () => {
    console.log('Server is running on port 3000');
});

// Handle closing the database connection when the server exits
process.on('SIGINT', () => {
    console.log('Server is shutting down');
    server.close(() => {
        console.log('HTTP server closed');
        // Close the database connection
        connection.end((err) => {
            if (err) {
                console.error('Error closing database connection:', err);
            } else {
                console.log('Database connection closed');
            }
            process.exit(0); // Exit the process
        });
    });
});
