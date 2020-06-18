const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
	_id: {
		type: String,
		required: true,
	},
	screen_name: {
		type: String,
		required: true,
	},
	limit: {
		type: Number,
		required: true,
		default: 10,
	},
	remaining: {
		type: Number,
		required: true,
		default: 10,
	},
	tweet_id: {
		type: String,
		required: true,
	},
});

const User = mongoose.model("user", UserSchema);

module.exports = User;
