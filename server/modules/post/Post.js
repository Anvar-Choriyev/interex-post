const { DataTypes } = require("sequelize");
const sequelize = require("../../core/config/database/database");
const Region = require("../region/Region");
const Order = require("../order/Order");
const postStatus = require("../../core/constants/postStatus");

const Post = sequelize.define("post", {
	id: {
		type: DataTypes.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	note: {
		type: DataTypes.TEXT,
	},
	postTotalPrice: {
		type: DataTypes.INTEGER,
	},
	regionId: {
		type: DataTypes.INTEGER,
	},
	postStatus: {
		type: DataTypes.ENUM(Object.values(postStatus)),
		defaultValue: postStatus.POST_NEW,
	},
});

Region.hasMany(Post, { as: "posts" });
Post.belongsTo(Region);

Post.hasMany(Order, { as: "orders" });
Order.belongsTo(Post);

module.exports = Post;
