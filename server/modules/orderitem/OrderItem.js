const { DataTypes } = require("sequelize");
const sequelize = require("../../core/config/database/database");
const Order = require("../order/Order");

const OrderItem = sequelize.define(
  "orderItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        max: {
          args: 30,
          msg: "Tovar nomi ko`pi bilan 30ta belgidan oshmasligi kerak",
        },
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  { underscored: true }
);

Order.hasMany(OrderItem, { as: "item", foreignKey: "orderId" });
OrderItem.belongsTo(Order, { as: "order" });

module.exports = OrderItem;
