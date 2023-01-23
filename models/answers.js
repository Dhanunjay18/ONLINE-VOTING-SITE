"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Answers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Answers.belongsTo(models.Questions, {
        foreignKey: "qid",
      });
      Answers.hasMany(models.Votes, {
        foreignKey: "aid",
      });
      // define association here
    }

    static async deleteAns(id) {
      return this.destroy({
        where : {
          id: id
        }
      })
    }
  }
  Answers.init(
    {
      title: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Answers",
    }
  );
  return Answers;
};
