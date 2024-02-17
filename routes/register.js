
const express = require('express');
const postsController = require('../controllers/post.controllers');
const bodyParser = require('body-parser');
const router = express.Router();

function isStrongPassword(password) {
    
    const lengthRegex = /.{8,}/; 
    const uppercaseRegex = /[A-Z]/; 
    const lowercaseRegex = /[a-z]/; 
    const numberRegex = /[0-9]/; 
    //const specialCharRegex = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-=]/; 


    const hasValidLength = lengthRegex.test(password);
    const hasUppercase = uppercaseRegex.test(password);
    const hasLowercase = lowercaseRegex.test(password);
    const hasNumber = numberRegex.test(password);
    //const hasSpecialChar = specialCharRegex.test(password);

    
    const strengthScore = [hasValidLength, hasUppercase, hasLowercase, hasNumber/*, hasSpecialChar*/]
        .filter(Boolean)
        .length;

    
    const minimumStrength = 2; 

    
    return strengthScore >= minimumStrength;
}

function checkUsername(username) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM users WHERE username = ?';
        connection.query(sql, [username], (error, result) => {
            if (error) {
                reject(error);
            } else {
                const usernameExists = result.length > 0;
                resolve(usernameExists);
            }
        });
    });
}

function insertData(username, password, email) {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        connection.query(sql, [username, password, email], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.insertId);
            }
        });
    });
}

router.use(bodyParser.json());


router.use('/register', async (req, res) => {
    const { name, pass, mail } = req.query; // Use req.query to access query parameters

    if (!isStrongPassword(pass)) {
        return res.status(400).json({ message: 'Password is not strong (length >= 8, one upper, one lower, one numeric, one special)' });
    } else if (!name) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        const usernameExists = await checkUsername(name);
        if (usernameExists) {
            return res.status(400).json({ message: 'Username already exists. Try another one ' });
        } else {
            const id = await insertData(name, pass, mail);
            return res.status(201).json({ message: `Data inserted new user with ID ${id}` });
        }
    } catch (error) {
        console.error('Error occurred during registration:', error);
        return res.status(500).json({ message: 'Error occurred during registration', error: error.message });
    }
});


router.post('/login/username/:name/password/:pass/email/:mail', (req, res, next) => {
    res.send("Welcome");
    next();
});


router.get('/', (req, res) => {
    res.send('Hello World');
});



module.exports = router;

