const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';


exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hashedPassword });
        res.status(201).json({ message: "User created", userId: user.id });
    } catch (e) {
        res.status(400).json({ error: "Registration failed" });
    }
};
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Неверный логин или пароль" });
        }

        // 2. Создаем токен
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '30d' } 
        );

        res.status(200).json({ 
            message: "Вход выполнен успешно", 
            token: token, 
            userId: user.id,
            username: user.username 
        });
    } catch (e) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
};