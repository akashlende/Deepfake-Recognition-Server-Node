const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TweetSchema = new Schema({
	_id: {
		type: String,
		required: true,
	},
	created_at: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		required: true,
	},
	timestamps: {
		type: Array,
		required: true,
	},
	confidence: {
		type: Number,
		required: true,
	},
	time_ms: {
		type: Number,
		required: true,
		default: 1000,
	},
	time_human_readable: {
		type: String,
		required: true,
		default: "",
	},
});

const Tweet = mongoose.model("tweet", TweetSchema);

module.exports = Tweet;
