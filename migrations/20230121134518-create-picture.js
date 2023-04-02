'use strict';
const DATE_MESSAGE = "Date must be in the format YYYY-MM-DD";
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Pictures', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            date: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            lastUpdated: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Date.now(),
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Pictures');
    }
};