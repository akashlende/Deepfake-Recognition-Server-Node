const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VideoSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  feedback: {
    type: String,
    required: true,
    default: "",
  },
  tweetId: {
    type: String,
    required: true,
  },
});

const UserSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  twitterUserId: {
    type: String,
    required: true,
  },

  videos: [VideoSchema],
});

const User = mongoose.model("user", UserSchema);

module.exports = User;
