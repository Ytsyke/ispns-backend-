const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Shift = sequelize.define('Shift', {
    date: { type: DataTypes.DATEONLY, allowNull: false },
    isWorking: { type: DataTypes.BOOLEAN, defaultValue: true },
    userId: { type: DataTypes.INTEGER, allowNull: false }
}, {
    indexes: [{ unique: true, fields: ['date', 'userId'] }] // Чтобы не было дублей у одного юзера
});

module.exports = Shift;