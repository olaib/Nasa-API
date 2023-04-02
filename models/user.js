'use strict';
const {
    Model
} = require('sequelize');
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*]).{8,32}$/,
    PASSWORD_MESSAGE = 'Password must be between 8 and 32 characters, and contain at ' +
        'least one lowercase letter, one uppercase letter, one number, and one special character',
    NAME_MESSAGE = 'name must be between 3 and 32 characters, and contain only lowercase letters',
    NAME_REGEX = /^[a-z]{3,32}$/;
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            this.Comments = this.hasMany(models.Comment, {foreignKey: 'userId'});
        }
    }

    User.init({
        firstName: {
            type: DataTypes.STRING,
            validate: {
                is: {
                    args: NAME_REGEX,
                    msg: `first${NAME_MESSAGE}`
                },
            }
        },
        lastName: {
            type: DataTypes.STRING,
            validate: {
                is: {
                    args: NAME_REGEX,
                    msg: `last${NAME_MESSAGE}`
                },
            }
        },
        email: {
            type: DataTypes.STRING,
            validate: {
                isEmail: {
                    args: true,
                    msg: `email must be a valid email address`
                }
            }
        },
        password: {
            type: DataTypes.STRING,
        },
    }, {
        sequelize,
        modelName: 'User',
    });
    return User;
};