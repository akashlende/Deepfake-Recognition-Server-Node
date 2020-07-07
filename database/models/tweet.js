const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TweetSchema = new Schema({
    _id: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    videoId: {
        type: String,
    },
});

const Tweet = mongoose.model("tweet", TweetSchema);

module.exports = Tweet;
