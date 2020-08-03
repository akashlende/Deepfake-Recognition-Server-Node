const mongoose = require("mongoose");
const User = require("./models/user");
const Tweet = require("./models/tweet");
const Video = require("./models/video");
const Limit = require("./models/limit");
const Image = require("./models/image");
const Complain = require("./models/complain");
class DeepfakeDB {
    constructor() {
        console.log("Database Instance Created");
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (limits == null) {
                    Limit.create({
                        fetchHistory: [],
                        classify: [],
                        removeVideo: [],
                        removeImage: [],
                        fetchVideoPath: [],
                        fetchImagePath: [],
                        getImage: [],
                        getPdfImage: [],
                        getPdfVideo: [],
                    })
                        .then((limits) => console.log("New Database Created!"))
                        .catch((err) => console.log(err));
                }
            });
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
                                    User.findOne(
                                        { _id: data._id },
                                        (err, user) => {
                                            callback(user, false);
                                        }
                                    );
                                } else throw err;
                            });
                    else callback(user);
                });
                break;
            case "tweets":
                Tweet.findOne({ _id: data._id }, (err, tweet) => {
                    if (!tweet)
                        Tweet.create(data).then((value) => callback(value));
                });
                break;
            case "videos":
                Video.findOne({ _id: data._id }, (err, video) => {
                    if (!video)
                        Video.create(data).then((video) => callback(video));
                });
                break;
            case "images":
                Image.findOne({ _id: data._id }, (err, image) => {
                    if (!image)
                        Image.create(data).then((image) => callback(image));
                });
                break;
            case "complains":
                Complain.findOne({ _id: data._id }, (err, complain) => {
                    if (!complain)
                        Complain.create(data).then((complain) =>
                            callback(complain)
                        );
                });
                break;
            case "limits-classify":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.classify.filter(
                                (limit) => limit.Id === data._id
                            );
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
            case "limits-remove-video":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.removeVideo.filter(
                                (limit) => limit.Id === data._id
                            );
                            if (t.length == 0) limits.removeVideo.push(data);

                            limits.save().then(() => {
                                callback();
                            });
                        }
                    });
                break;
            case "limits-remove-image":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.removeImage.filter(
                                (limit) => limit.Id === data._id
                            );
                            if (t.length == 0) limits.removeImage.push(data);

                            limits.save().then(() => {
                                callback();
                            });
                        }
                    });
                break;
            case "limits-get-image":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.getImage.filter(
                                (limit) => limit.Id === data._id
                            );
                            if (t.length == 0) limits.getImage.push(data);
                            limits.save().then(() => {
                                callback();
                            });
                        }
                    });
                break;
            case "fetch-image-path":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.fetchImagePath.filter(
                                (limit) => limit.Id === data._id
                            );
                            if (t.length == 0) limits.fetchImagePath.push(data);
                            limits.save().then(() => {
                                callback();
                            });
                        }
                    });
                break;
            case "fetch-video-path":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.fetchVideoPath.filter(
                                (limit) => limit.Id === data._id
                            );
                            if (t.length == 0) limits.fetchVideoPath.push(data);
                            limits.save().then(() => {
                                callback();
                            });
                        }
                    });
                break;
            case "get-pdf-video":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.getPdfVideo.filter(
                                (limit) => limit.Id === data._id
                            );
                            if (t.length == 0) limits.getPdfVideo.push(data);
                            limits.save().then(() => {
                                callback();
                            });
                        }
                    });
                break;
            case "get-pdf-image":
                Limit.findOne({})
                    .exec()
                    .then((limits) => {
                        if (limits != null) {
                            let t = limits.getPdfImage.filter(
                                (limit) => limit.Id === data._id
                            );
                            if (t.length == 0) limits.getPdfImage.push(data);
                            limits.save().then(() => {
                                callback();
                            });
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

    findComplain(complainId, callback) {
        console.log(complainId)
        return Complain.findById(complainId).exec();
    }

    insertUserComplain(userId, data, callback) {
        User.findOne({ _id: userId })
            .exec()
            .then((user) => {
                if (user !== null) {
                    console.log("user.....");
                    user.complains.push(data);
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
    findLimitfetchImagePath(userId, callback) {
        Limit.findOne({})
            .exec()
            .then((collection) => {
                collection.fetchImagePath.forEach((history) => {
                    if (history._id == userId) {
                        callback(history);
                    }
                });
            });
    }
    findLimitfetchVideoPath(userId, callback) {
        Limit.findOne({})
            .exec()
            .then((collection) => {
                collection.fetchVideoPath.forEach((history) => {
                    if (history._id == userId) {
                        callback(history);
                    }
                });
            });
    }
    findgetPdfVideo(userId, callback) {
        Limit.findOne({})
            .exec()
            .then((collection) => {
                collection.getPdfVideo.forEach((history) => {
                    if (history._id == userId) {
                        callback(history);
                    }
                });
            });
    }
    findgetPdfImage(userId, callback) {
        Limit.findOne({})
            .exec()
            .then((collection) => {
                collection.getPdfImage.forEach((history) => {
                    if (history._id == userId) {
                        callback(history);
                    }
                });
            });
    }
    findLimitRemoveVideo(userId, callback) {
        Limit.findOne({})
            .exec()
            .then((collection) => {
                collection.removeVideo.forEach((history) => {
                    if (history._id == userId) {
                        callback(history);
                    }
                });
            });
    }
    findLimitRemoveImage(userId, callback) {
        Limit.findOne({})
            .exec()
            .then((collection) => {
                collection.removeImage.forEach((history) => {
                    if (history._id == userId) {
                        console.log("history", history);
                        callback(history);
                    }
                });
            });
    }
    findLimitGetImage(userId, callback) {
        Limit.findOne({})
            .exec()
            .then((collection) => {
                collection.getImage.forEach((history) => {
                    if (history._id == userId) {
                        console.log("history", history);
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
                    console.log(
                        "no user id found in fetchHistory in DeepfakeDB.js"
                    );
                }
                limits.save().then(() => {
                    callback(rate);
                });
            });
    }
    decRemoveVideo(userId, callback) {
        let rate;
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (
                    limits.removeVideo.filter((limit) => {
                        return limit._id === userId;
                    }).length !== 0
                ) {
                    rate = limits.removeVideo.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining;
                    limits.removeVideo.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining -= 1;
                } else {
                    console.log(
                        "no user id found in remove Video in DeepfakeDB.js"
                    );
                }
                limits.save().then(() => {
                    callback(rate);
                });
            });
    }

    decRemoveImage(userId, callback) {
        let rate;
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (
                    limits.removeImage.filter((limit) => {
                        return limit._id === userId;
                    }).length !== 0
                ) {
                    rate = limits.removeImage.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining;
                    limits.removeImage.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining -= 1;
                } else {
                    console.log(
                        "no user id found in remove Image in DeepfakeDB.js"
                    );
                }
                limits.save().then(() => {
                    callback(rate);
                });
            });
    }
    decfetchImagePath(userId, callback) {
        let rate;
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (
                    limits.fetchImagePath.filter((limit) => {
                        return limit._id === userId;
                    }).length !== 0
                ) {
                    rate = limits.fetchImagePath.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining;
                    limits.fetchImagePath.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining -= 1;
                } else {
                    console.log(
                        "no user id found in fetch image path in DeepfakeDB.js"
                    );
                }
                limits.save().then(() => {
                    callback(rate);
                });
            });
    }
    decfetchVideoPath(userId, callback) {
        let rate;
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (
                    limits.fetchVideoPath.filter((limit) => {
                        return limit._id === userId;
                    }).length !== 0
                ) {
                    rate = limits.fetchVideoPath.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining;
                    limits.fetchVideoPath.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining -= 1;
                } else {
                    console.log(
                        "no user id found in fetch video path in DeepfakeDB.js"
                    );
                }
                limits.save().then(() => {
                    callback(rate);
                });
            });
    }
    decgetPdfVideo(userId, callback) {
        let rate;
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (
                    limits.getPdfVideo.filter((limit) => {
                        return limit._id === userId;
                    }).length !== 0
                ) {
                    rate = limits.getPdfVideo.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining;
                    limits.getPdfVideo.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining -= 1;
                } else {
                    console.log(
                        "no user id found in getPdf Video in DeepfakeDB.js"
                    );
                }
                limits.save().then(() => {
                    callback(rate);
                });
            });
    }
    decgetPdfImage(userId, callback) {
        let rate;
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (
                    limits.getPdfImage.filter((limit) => {
                        return limit._id === userId;
                    }).length !== 0
                ) {
                    rate = limits.getPdfImage.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining;
                    limits.getPdfImage.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining -= 1;
                } else {
                    console.log(
                        "no user id found in getPdfImage in DeepfakeDB.js"
                    );
                }
                limits.save().then(() => {
                    callback(rate);
                });
            });
    }

    decGetImage(userId, callback) {
        let rate;
        Limit.findOne({})
            .exec()
            .then((limits) => {
                if (
                    limits.getImage.filter((limit) => {
                        return limit._id === userId;
                    }).length !== 0
                ) {
                    rate = limits.getImage.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining;
                    limits.getImage.filter((limit) => {
                        return limit._id === userId;
                    })[0].remaining -= 1;
                } else {
                    console.log(
                        "no user id found in remove Image in DeepfakeDB.js"
                    );
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
                    console.log(
                        "no user id found in Classify in DeepfakeDB.js"
                    );
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
                                this.insert(
                                    "limits-remove-video",
                                    {
                                        _id: user._id,
                                        limit: 10,
                                        remaining: 10,
                                    },
                                    () => {
                                        this.insert(
                                            "limits-remove-image",
                                            {
                                                _id: user._id,
                                                limit: 10,
                                                remaining: 10,
                                            },
                                            () => {
                                                this.insert(
                                                    "limits-get-image",
                                                    {
                                                        _id: user._id,
                                                        limit: 10,
                                                        remaining: 10,
                                                    },

                                                    () => {
                                                        this.insert(
                                                            "fetch-image-path",
                                                            {
                                                                _id: user._id,
                                                                limit: 10,
                                                                remaining: 10,
                                                            },
                                                            () => {
                                                                this.insert(
                                                                    "fetch-video-path",
                                                                    {
                                                                        _id:
                                                                            user._id,
                                                                        limit: 10,
                                                                        remaining: 10,
                                                                    },
                                                                    () => {
                                                                        this.insert(
                                                                            "get-pdf-video",
                                                                            {
                                                                                _id:
                                                                                    user._id,
                                                                                limit: 10,
                                                                                remaining: 10,
                                                                            },
                                                                            () => {
                                                                                this.insert(
                                                                                    "get-pdf-image",
                                                                                    {
                                                                                        _id:
                                                                                            user._id,
                                                                                        limit: 10,
                                                                                        remaining: 10,
                                                                                    },
                                                                                    () => {
                                                                                        console.log(
                                                                                            "New user created : ",
                                                                                            user._id
                                                                                        );
                                                                                        callback(
                                                                                            user
                                                                                        );
                                                                                    }
                                                                                );
                                                                            }
                                                                        );
                                                                    }
                                                                );
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
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

db.users.drop()
db.limits.drop()
db.videos.drop()
db.tweets.drop()
db.images.drop()
db.complain.drop()

db.users.find({}).pretty()
db.limits.find({}).pretty()
db.videos.find({}).pretty()
db.tweets.find({}).pretty()
db.images.find({}).pretty()

 */
