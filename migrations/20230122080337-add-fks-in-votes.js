"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addConstraint("Votes", {
      fields: ["qid"],
      type: "foreign key",
      references: {
        table: "Questions",
        field: "id",
      },
    });
    await queryInterface.addConstraint("Votes", {
      fields: ["eid"],
      type: "foreign key",
      references: {
        table: "Elections",
        field: "id",
      },
    });
    await queryInterface.addConstraint("Votes", {
      fields: ["vid"],
      type: "foreign key",
      references: {
        table: "Voters",
        field: "id",
      },
    });
    await queryInterface.addConstraint("Votes", {
      fields: ["aid"],
      type: "foreign key",
      references: {
        table: "Answers",
        field: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
