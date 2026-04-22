const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Message = sequelize.define('Message', {
    text: { type: DataTypes.TEXT, allowNull: false },
    sender: { type: DataTypes.STRING, allowNull: false },
    receiver: { type: DataTypes.STRING, allowNull: false }, 
    time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = Message;