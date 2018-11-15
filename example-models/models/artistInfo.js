const db = require("../db");
const DataTypes = db.Sequelize;

module.exports = db.define(
  "artistInfo",
  {
    birthplace: DataTypes.STRING,
    favoriteFood: DataTypes.STRING,
  }
);
