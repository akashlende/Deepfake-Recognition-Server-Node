const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VideoSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  feedback: {
    type: String,
    default: "",
  },
  tweetId: {
    type: String,
    default: null,
  },
});

const UserSchema = new Schema({
  _id: {
    type: String,
  },
  email: {
    type: String,
    default: null,
  },
  password: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  twitterUserId: {
    type: String,
    default: null,
  },

  videos: [VideoSchema],
});

const User = mongoose.model("user", UserSchema);

module.exports = User;
