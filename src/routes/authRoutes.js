const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const User = require('../models/User');

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'username'] });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: "Ошибка при получении списка пользователей" });
    }
});
module.exports = router;