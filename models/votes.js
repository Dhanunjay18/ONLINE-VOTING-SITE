"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Votes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Votes.belongsTo(models.Voters, {
        foreignKey: "vid",
      });
      Votes.belongsTo(models.Questions, {
        foreignKey: "qid",
      });
      Votes.belongsTo(models.Elections, {
        foreignKey: "eid",
      });
      Votes.belongsTo(models.Answers, {
        foreignKey: "aid",
      });
    }
  }
  Votes.init(
    {
      eid: DataTypes.INTEGER,
      qid: DataTypes.INTEGER,
      aid: DataTypes.INTEGER,
      vid: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Votes",
    }
  );
  return Votes;
};
