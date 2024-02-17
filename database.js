require('dotenv').config();
const mysql = require('mysql2');
//const mysql = require('mysql2/promise');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PW,
    database: 'db',
});

connection.connect((error) => {
    if (error) {
        console.error('Error connecting to MySQL database: ', error);
    } else {
        console.log('Connected to MySQL database!');
        //addTable();
    }
});

module.exports = connection;

console.log('Connection ended');