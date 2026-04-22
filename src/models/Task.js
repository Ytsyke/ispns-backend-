const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Task = sequelize.define('Task', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    date: { type: DataTypes.DATEONLY, allowNull: false }, // Используем DATEONLY для работы с YYYY-MM-DD
    priority: { type: DataTypes.STRING, defaultValue: 'Средний' },
    isDone: { type: DataTypes.BOOLEAN, defaultValue: false },
    userId: { type: DataTypes.INTEGER, allowNull: false } // Привязка к пользователю
});

module.exports = Task;