const mongoose = require("mongoose");
const User = require("./models/user");
const Tweet = require("./models/tweet");
const Video = require("./models/video");
const Limit = require("./models/limit");
const Image = require("./models/image");
class DeepfakeDB {
	constructor() {
		console.log("Database Instance Created");
	}

	connect() {
		mongoose.connect("mongodb://localhost/deepfake", {
			useCreateIndex: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
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
				User.findOne({ _id: data._id }, (err, user) => {
					if (user == null)
						User.create(data)
							.then((value) => callback(value, true))
							.catch((err) => {
								if (err.code === 11000) {
									console.log(
										`ERR: Creation of duplicate user ${err.keyValue._id} failed`
									);
									User.findOne({ _id: data._id }, (err, user) => {
										callback(user, false);
									});
								} else throw err;
							});
					else callback(user);
				});
				break;
			case "tweets":
				Tweet.findOne({ _id: data._id }, (err, tweet) => {
					if (!tweet) Tweet.create(data).then((value) => callback(value));
				});
				break;
			case "videos":
				Video.findOne({ _id: data._id }, (err, video) => {
					if (!video) Video.create(data).then((video) => callback(video));
				});
				break;
			case "images":
				Image.findOne({ _id: data._id }, (err, image) => {
					if (!image) Image.create(data).then((image) => callback(image));
				});
				break;
			case "limits-classify":
				Limit.findOne({})
					.exec()
					.then((limits) => {
						if (limits != null) {
							let t = limits.classify.filter((limit) => limit.Id === data._id);
							if (t.length == 0) limits.classify.push(data);

							limits.save().then(() => {
								callback();
							});
						}
					});
				break;
			case "limits-fetch-history":
				Limit.findOne({})
					.exec()
					.then((limits) => {
						if (limits != null) {
							let t = limits.fetchHistory.filter(
								(limit) => limit.Id === data._id
							);
							if (t.length == 0) limits.fetchHistory.push(data);

							limits.save().then(() => {
								callback();
							});
						}
					});
				break;
			case "limits":
				Limit.findOne({})
					.exec()
					.then((limits) => {
						if (limits === null) {
							Limit.create({ fetchHistory: [], classify: [] })
								.then((v) => {
									callback(null, v);
								})
								.catch((err) => callback(err, null));
						}
					});
				break;
			default:
				break;
		}
	}

	updateLimits(callback) {
		Limit.findOne({})
			.exec()
			.then((limits) => {
				for (let key in limits.toJSON()) {
					if (!(key == "_id" || key == "__v")) {
						limits[key].forEach((l) => {
							l.remaining = l.limit;
						});
					}
				}
				limits.save().then((limits) => {
					callback(limits);
				});
			});
	}

	insertUserVideo(userId, data, callback) {
		User.findOne({ _id: userId })
			.exec()
			.then((user) => {
				if (user !== null) {
					user.videos.push(data);
					user.save().then(() => {
						callback(user);
					});
				}
			});
	}

	insertUserImage(userId, data, callback) {
		User.findOne({ _id: userId })
			.exec()
			.then((user) => {
				if (user !== null) {
					user.images.push(data);
					user.save().then(() => {
						callback(user);
					});
				}
			});
	}

	findUser(userId, callback) {
		User.findById(userId)
			.exec()
			.then((user) => callback(user));
	}
	findTwitterUser(twitterId, callback) {
		User.findOne({ twitterUserId: twitterId })
			.exec()
			.then((user) => callback(user));
	}
	findLimitClassify(userId, callback) {
		let flag = false;
		Limit.findOne({})
			.exec()
			.then((collection) => {
				collection.classify.forEach((history) => {
					if (history._id == userId) {
						flag = true;
						callback(history);
					}
				});
			})
			.catch((err) => console.log(err));
	}
	findLimitFetchHistory(userId, callback) {
		Limit.findOne({})
			.exec()
			.then((collection) => {
				collection.fetchHistory.forEach((history) => {
					if (history._id == userId) {
						callback(history);
					}
				});
			});
	}
	findVideo(vidId) {
		return Video.findById(vidId).exec();
	}
	findImage(imgId) {
		return Image.findById(imgId).exec();
	}

	decFetchRemaining(userId, callback) {
		let rate;
		Limit.findOne({})
			.exec()
			.then((limits) => {
				if (
					limits.fetchHistory.filter((limit) => {
						return limit._id === userId;
					}).length !== 0
				) {
					rate = limits.fetchHistory.filter((limit) => {
						return limit._id === userId;
					})[0].remaining;
					limits.fetchHistory.filter((limit) => {
						return limit._id === userId;
					})[0].remaining -= 1;
				} else {
					console.log("no user id found in fetchHistory in DeepfakeDB.js");
				}
				limits.save().then(() => {
					callback(rate);
				});
			});
	}

	decClassifyRemaining(userId, callback) {
		let rate;
		Limit.findOne({})
			.exec()
			.then((limits) => {
				if (
					limits.classify.filter((limit) => {
						return limit._id === userId;
					}).length !== 0
				) {
					rate = limits.classify.filter((limit) => {
						return limit._id === userId;
					})[0];
					limits.classify.filter((limit) => {
						return limit._id === userId;
					})[0].remaining -= 1;
				} else {
					console.log("no user id found in Classify in DeepfakeDB.js");
				}
				limits.save().then(() => {
					callback(rate);
				});
			});
	}

	createNewUser(data, callback) {
		this.insert("users", data, (user, n) => {
			if (n === true) {
				this.insert(
					"limits-classify",
					{ _id: user._id, limit: 10, remaining: 10 },
					() => {
						this.insert(
							"limits-fetch-history",
							{
								_id: user._id,
								limit: 10,
								remaining: 10,
							},
							() => {
								console.log("New user created : ", user._id);
								callback(user);
							}
						);
					}
				);
			} else {
				callback(user);
			}
		});
	}

	deleteTweets(callback) {
		let promises = [];
		Tweet.find({})
			.exec()
			.then((tweets) => {
				tweets.forEach((tweet) => {
					promises.push(
						new Promise((resolve, reject) => {
							if (tweet.processed === false)
								Tweet.remove({ _id: tweet._id }).then((t) => {
									resolve(t);
								});
							else resolve(tweet);
						})
					);
				});
				Promise.all(tweets).then((tweets) => {
					callback(tweets);
				});
			});
	}

	isTweetProcessed(str, callback) {
		Tweet.findOne({ _id: str })
			.exec()
			.then((tweet) => {
				tweet == null ? callback(false) : callback(true);
			});
	}
}

const deepfakeDB = new DeepfakeDB();

module.exports = deepfakeDB;

/* 
db.limits.insert({
    fetchHistory: [
        { _id: "12345", limit: 10, remaining: 10 },
        { _id: "54321", limit: 10, remaining: 10 },
    ],
    classify: [
        { _id: "12345", limit: 10, remaining: 10 },
        { _id: "54321", limit: 10, remaining: 10 },
    ],
});

db.users.drop()
db.limits.drop()
db.videos.drop()
db.tweets.drop()
db.limits.insert({fetchHistory: [],classify: []});

db.users.find({}).pretty()
db.limits.find({}).pretty()
db.videos.find({}).pretty()
db.tweets.find({}).pretty()

db.users.insert(
  {
      "_id": "12345",
      "email": "akash.lende12@gmail.com",
      "name": "Akash Lende",
      "password": "1234567890",
      "videos": []
    }
)

db.limits.insert( {
  "_id" : ObjectId("5f072ad2ec495848bc14cba2"),
        "fetchHistory" : [
               
                {
                        "_id" : "12345",
                        "limit" : 10,
                        "remaining" : 10
                }
        ],
        "classify" : [
                
                {
                        "_id" : "12345",
                        "limit" : 100,
                        "remaining" : 100
                }
        ],
})
 */
