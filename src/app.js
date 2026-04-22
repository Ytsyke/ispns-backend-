const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sequelize = require('./db');
const authRoutes = require('./routes/authRoutes');
const Message = require('./models/Message');
const  User  = require('./models/User');
const Task = require('./models/Task');
const Shift = require('./models/Shift');
const { Op } = require('sequelize');
const app = express();
app.use(cors());
app.use(express.json());

// Подключаем роуты
app.use('/api/auth', authRoutes);

// Добавим API для загрузки истории сообщений (между двумя людьми)
app.get('/api/chat/history/:sender/:receiver', async (req, res) => {
    const { sender, receiver } = req.params;
    try {
        const history = await Message.findAll({
            where: {
                // Ищем сообщения, где отправитель/получатель — это эти двое
                [require('sequelize').Op.or]: [
                    { sender: sender, receiver: receiver },
                    { sender: receiver, receiver: sender }
                ]
            },
            order: [['createdAt', 'ASC']]
        });
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: "Ошибка загрузки истории" });
    }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Логика сообщений
io.on('connection', (socket) => {
    console.log('Подключен сокет:', socket.id);

    // 1. Личная комната пользователя для уведомлений в списке чатов
    socket.on('join_list', (username) => {
        socket.join(`list_${username}`);
        console.log(`Пользователь ${username} подписался на уведомления списка`);
    });

    // 2. Комната конкретного чата
    socket.on('join_chat', (data) => {
        // Создаем уникальный ID комнаты: сортируем имена, чтобы у обоих был один и тот же ID
        const room = [data.sender, data.receiver].sort().join('_');
        socket.join(room);
        console.log(`Сокет ${socket.id} вошел в чат: ${room}`);
    });

    socket.on('send_message', async (data) => {
        try {
            const savedMsg = await Message.create({
                text: data.text,
                sender: data.sender,
                receiver: data.receiver,
                time: data.time || new Date()
            });

            const room = [data.sender, data.receiver].sort().join('_');

            // Отправляем сообщение ТОЛЬКО в комнату этого чата
            io.to(room).emit('receive_message', savedMsg);

            io.to(`list_${data.receiver}`).emit('update_chat_list', savedMsg);
            io.to(`list_${data.sender}`).emit('update_chat_list', savedMsg);
            
        } catch (err) {
            console.error('Ошибка:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Отключено:', socket.id);
    });
});

// const PORT = process.env.PORT || 3000;


// 1. Получение только тех пользователей, с кем уже есть переписка
app.get('/api/chat/active-dialogs/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const messages = await Message.findAll({
            where: {
                [require('sequelize').Op.or]: [{ sender: username }, { receiver: username }]
            },
            order: [['createdAt', 'DESC']]
        });

        const dialogs = [];
        const seen = new Set();

        for (const msg of messages) {
            const partner = msg.sender === username ? msg.receiver : msg.sender;
            if (!seen.has(partner)) {
                seen.add(partner);
                
                // Проверяем, есть ли хоть одно непрочитанное сообщение ОТ партнера к НАМ
                const unreadCount = await Message.count({
                    where: {
                        sender: partner,
                        receiver: username,
                        isRead: false
                    }
                });

                dialogs.push({
                    username: partner,
                    lastMessage: msg.text,
                    time: msg.time,
                    isNew: unreadCount > 0 // Если есть непрочитанные, будет true
                });
            }
        }
        res.json(dialogs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Поиск пользователя по точному совпадению (для добавления нового чата)
app.get('/api/auth/search/:username', async (req, res) => {
    const { username } = req.params;
    console.log(`Поиск пользователя: ${username}`);
    try {
        const users = await User.findAll({ 
            where: { 
                username: {
                    
                    [Op.iLike]: `%${username}%`
                }
            },
            attributes: ['id', 'username'],
            limit: 10 
            
        });
        console.log(`Найдено: ${users.length}`);
        
        // Возвращаем список, даже если там один человек
        res.json(users); 
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка поиска" });
    }
});

app.put('/api/chat/read', async (req, res) => {
    const { sender, receiver } = req.body;
    try {
        await Message.update({ isRead: true }, {
            where: { sender: sender, receiver: receiver, isRead: false }
        });

        // Уведомляем пользователя (получателя), что сообщения от этого отправителя прочитаны
        io.to(`list_${receiver}`).emit('messages_read', { from: sender });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Синхронизация БД и запуск
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT}`));
});
// --- API для ЗАДАЧ ---
app.get('/api/tasks/:userId', async (req, res) => {
    try {
        const tasks = await Task.findAll({ where: { userId: req.params.userId } });
        res.json(tasks);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/tasks', async (req, res) => {
    try {
        const task = await Task.create(req.body); // req.body должен содержать userId, title и т.д.
        res.status(201).json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    await Task.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
});

// --- API для СМЕН ---
app.get('/api/shifts/:userId', async (req, res) => {
    const shifts = await Shift.findAll({ where: { userId: req.params.userId } });
    res.json(shifts);
});

app.post('/api/shifts/batch', async (req, res) => {
    const { userId, shifts } = req.body; // Принимаем массив смен
    // Удаляем старые на эти даты или просто добавляем (зависит от логики)
    const results = await Shift.bulkCreate(
        shifts.map(s => ({ ...s, userId })),
        { updateOnDuplicate: ["isWorking"] } 
    );
    res.json(results);
});