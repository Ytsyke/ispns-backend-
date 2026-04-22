const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ShiftTemplate = sequelize.define('ShiftTemplate', {
    pattern: { type: DataTypes.STRING, defaultValue: '5/2' },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true }
});

module.exports = ShiftTemplate;