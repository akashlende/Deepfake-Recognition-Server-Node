const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TweetSchema = new Schema({
	_id: {
		type: String,
		required: true,
	},
	userId: {
		type: Number,
		required: true,
		
	},
	videoId: {
		type: String,
		required: true,
	
	},
});

const Tweet = mongoose.model("tweet", TweetSchema);

module.exports = Tweet;
