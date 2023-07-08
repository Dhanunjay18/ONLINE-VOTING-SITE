"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Elections extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Elections.belongsTo(models.Admin, {
        foreignKey: "adminId",
      });
      Elections.hasMany(models.Questions, {
        foreignKey: "eid",
      });
      Elections.hasMany(models.Voters, {
        foreignKey: "eid",
      });
      Elections.hasMany(models.Votes, {
        foreignKey: "eid",
      });
    }

    static addElections({ name, adminId, electionStatus }) {
      return this.create({
        name: name,
        // dueDate: dueDate,
        // completed: false,
        adminId,
        electionsStatus: electionStatus
      });
    }

    static getElections(adminId) {
      return this.findAll({
        where: {
          adminId,
        },
      });
    }

    static async remove(id, adminId) {
      return this.destroy({
        where: {
          id,
          adminId,
        },
      });
    }
  }
  Elections.init(
    {
      name: DataTypes.STRING,
      electionStatus: DataTypes.BOOLEAN
    },
    {
      sequelize,
      modelName: "Elections",
    }
  );
  return Elections;
};
