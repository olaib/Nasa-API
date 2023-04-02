'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Picture extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            // this.Comments = this.hasMany(models.Comment, { foreignKey: 'date' });
        }
    }

    Picture.init({
        date: {
            type: DataTypes.STRING,
            isDate: {
                args: true,
                msg: 'Date must be in the format YYYY-MM-DD',
            }
        },
        lastUpdated: {
            type: DataTypes.DATE,
            defaultValue: Date.now()
        },
    }, {
        sequelize,
        modelName: 'Picture',
    });
    return Picture;
};