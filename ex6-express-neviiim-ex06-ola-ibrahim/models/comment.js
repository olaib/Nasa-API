'use strict';
const {
    Model
} = require('sequelize');
const NAME_MESSAGE = 'name must be between 3 and 32 characters, and contain only lowercase letters',
    NAME_REGEX = /^[a-z]{3,32}$/,
    DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
module.exports = (sequelize, DataTypes) => {
    class Comment extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            // this.Picture = this.belongsTo(models.Picture, {foreignKey: 'date'});
            // this.User = this.belongsTo(models.User, {foreignKey: 'userId'});
        }
    }

    Comment.init({
        text: {
            type: DataTypes.STRING,
            validate: {
                len: {
                    args: [1, 128],
                    msg: 'Comment must be between 1 and 128 characters'
                },
            }
        },
        username: {
            type: DataTypes.STRING,
            validate: {
                is: {
                    args: NAME_REGEX,
                    msg: `user${NAME_MESSAGE}`
                }
            }
        },
        imageId: {
            type: DataTypes.STRING,
            validate: {
                is: {
                    args: DATE_REGEX,
                    msg: 'Image ID must be in the format YYYY-MM-DD',
                }
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            validate: {
                isInt: {
                    args: true,
                    msg: 'userId must be an integer'
                }
            }
        },
        deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            validate: {
                isBoolean: {
                    args: true,
                    msg: 'deleted must be a boolean'
                }
            }
        }
    }, {
        sequelize,
        modelName: 'Comment',
    });
    return Comment;
};