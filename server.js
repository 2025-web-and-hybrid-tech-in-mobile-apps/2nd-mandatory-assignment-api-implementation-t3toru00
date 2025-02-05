const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');

app.use(express.json()); // for parsing application/json

const JWT_SECRET = 'your-secret-key';
const users = new Map();
const highScores = [];

// Middleware to validate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(401);
        req.user = user;
        next();
    });
};

// Validate signup/login request body
const validateUserInput = (req, res, next) => {
    const { userHandle, password } = req.body;

    // Check for additional fields
    const allowedFields = ['userHandle', 'password'];
    const hasExtraFields = Object.keys(req.body).some(key => !allowedFields.includes(key));
    if (hasExtraFields || Object.keys(req.body).length !== 2) {
        return res.sendStatus(400);
    }

    // Basic validation
    if (!userHandle || !password) {
        return res.sendStatus(400);
    }

    // Type validation
    if (typeof userHandle !== 'string' || typeof password !== 'string') {
        return res.sendStatus(400);
    }

    // Length validation
    if (userHandle.length < 6 || password.length < 6) {
        return res.sendStatus(400);
    }

    next();
};

// Signup endpoint
app.post('/signup', (req, res) => {
    const { userHandle, password } = req.body;
    
    // Only check length and existence
    if (!userHandle || !password || 
        userHandle.length < 6 || 
        password.length < 6) {
        return res.sendStatus(400);
    }
    
    // Store user
    users.set(userHandle, password);
    res.sendStatus(201);
});

// Login endpoint with strict validation
app.post('/login', validateUserInput, (req, res) => {
    const { userHandle, password } = req.body;
    
    // Check credentials
    if (!users.has(userHandle) || users.get(userHandle) !== password) {
        return res.sendStatus(401);
    }

    // Generate token
    const token = jwt.sign({ userHandle }, JWT_SECRET);
    res.status(200).json({ jsonWebToken: token });
});

// Validate high score input
const validateHighScore = (req, res, next) => {
    const { level, userHandle, score, timestamp } = req.body;
    
    if (!level || !userHandle || typeof score !== 'number' || !timestamp) {
        return res.sendStatus(400);
    }

    // Validate timestamp format (ISO 8601)
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    if (!timestampRegex.test(timestamp)) {
        return res.sendStatus(400);
    }

    if (req.user.userHandle !== userHandle) {
        return res.sendStatus(400);
    }

    next();
};

// Post high score endpoint
app.post('/high-scores', authenticateToken, validateHighScore, (req, res) => {
    const score = {
        level: req.body.level,
        userHandle: req.body.userHandle,
        score: req.body.score,
        timestamp: req.body.timestamp
    };

    highScores.push(score);
    res.sendStatus(201);
});

// Get high scores endpoint
app.get('/high-scores', (req, res) => {
    const { level, page = 1 } = req.query;
    const pageSize = 20;

    if (!level) return res.sendStatus(400);

    const filteredScores = highScores
        .filter(score => score.level === level)
        .sort((a, b) => b.score - a.score);

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedScores = filteredScores.slice(startIndex, endIndex);

    res.json(paginatedScores);
});

//------ WRITE YOUR SOLUTION ABOVE THIS LINE ------//

let serverInstance = null;
module.exports = {
    start: function() {
        serverInstance = app.listen(port, () => {
            console.log(`Example app listening at http://localhost:${port}`);
        });
    },
    close: function() {
        serverInstance.close();
    }
};
