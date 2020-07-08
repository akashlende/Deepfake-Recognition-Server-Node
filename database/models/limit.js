const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RateSchema = new Schema({
	_id: {
		type: String,
		required: true,
	},
	limit: {
		type: Number,
		required: true,
	},
	remaining: {
		type: Number,
		required: true,
	},
});

const LimitSchema = new Schema({
	fetchHistory: [RateSchema],
	classify: [RateSchema],
});

const Limit = mongoose.model("limit", LimitSchema);

module.exports = Limit;
