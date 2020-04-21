const express = require('express');
const router = express.Router();



/* routes begin with /auth */

/* user requests auth page */
/* eventually replaced with home page */
router.get('/', (req, res) => {
    res.render('auth');
});

/* user requests login page */
router.get('/login', (req, res) => {
    res.render('login');
});

/* user sends login information */
router.post('/login', (req, res) => {

});

/* user requests registration page */
router.get('/register', (req, res) => {
    res.render('register');
});

/* user sends registration information */
router.post('/register', (req, res) => {

});

module.exports = router;
