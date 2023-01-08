"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Questions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Questions.belongsTo(models.Elections, {
        foreignKey: "eid",
      });
    }

    static createQuestions(title, eid) {
      return this.create({
        title: title,
        eid,
      });
    }

    static removeQuestions(id, eid) {
      return this.destroy({
        where: {
          id,
          eid,
        },
      });
    }
  }
  Questions.init(
    {
      title: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Questions",
    }
  );
  return Questions;
};
