const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

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
        required: false,
    },
    name: {
        type: String,
        default: "",
    },
    email: {
        type: String,
        required: true,
    },
    twitterUserId: {
        type: String,
        default: "",
    },
    videos: [VideoSchema],
});

UserSchema.plugin(passportLocalMongoose);

const User = mongoose.model("user", UserSchema);

module.exports = User;
