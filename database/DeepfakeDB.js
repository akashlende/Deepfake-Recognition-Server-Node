const mongoose = require("mongoose");
const User = require("./models/user");
const Tweet = require("./models/tweet");

class DeepfakeDB {
	constructor() {
		console.log("Database Instance Created");
	}

	connect() {
		mongoose.connect("mongodb://localhost/deepfake", {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		mongoose.connection
			.once("open", () => {
				console.log("DB Connected");
			})
			.on("error", (err) => {
				console.log("DB Connection Error: " + err);
			});
	}

	insert(collection, data, callback) {
		switch (collection) {
			case "users":
				// Checking if that same tweet exists, instead of if the user exists.
				/* If it writes only on the basis of the user's existence, 
				the new tweets of the user are not written into the 'users' collection*/
				User.findOne({ tweet_id: data.tweet_id }, (err, user) => {
					if (!user) User.create(data).then((value) => callback(value));
				});
				break;
			case "tweets":
				Tweet.findOne({ _id: data._id }, (err, tweet) => {
					if (!tweet) Tweet.create(data).then((value) => callback(value));
				});
				break;
			default:
				break;
		}
	}

	findUser(userId, callback) {
		User.findOne({ _id: userId }).exec()
			.then(user => callback(user))
	}

	remove(collection, id, callback) { }

	update(collection, id, data, callback) { }
}

module.exports = DeepfakeDB;
