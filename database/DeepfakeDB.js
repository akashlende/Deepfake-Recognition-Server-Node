const mongoose = require("mongoose");
const User = require("./models/user");
const Tweet = require("./models/tweet");
const Video = require("./models/video");
const Limit = require("./models/limit");
class DeepfakeDB {
  constructor() {
    console.log("Database Instance Created");
  }

  connect() {
    mongoose.connect("mongodb://localhost/deepfake", {
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
        console.log(data);
        User.findOne({ _id: data._id }, (err, user) => {
          if (!user) User.create(data).then((value) => callback(value));
        });
        break;
      case "tweets":
        Tweet.findOne({ _id: data._id }, (err, tweet) => {
          if (!tweet) Tweet.create(data).then((value) => callback(value));
        });
        break;
      case "videos":
        Video.findOne({ _id: data._id }, (err, video) => {
          if (!video) Video.create(data);
        });
        break;
      case "limits-classify":
        Limit.findOne({})
          .exec()
          .then((limits) => {
            limits.classify.push(data);
            limits.save().then(() => {
              callback();
            });
          });
      default:
        break;
    }
  }

  insertUserVideo(userId, data, callback) {
    User.findOne({ _id: userId })
      .exec()
      .then((user) => {
        user.videos.push(data);
        user.save().then(() => {
          callback(user);
        });
      });
  }

  findUser(userId, callback) {
    User.findOne({ _id: userId })

      .exec()
      .then((user) => callback(user));
  }
  findLimitClassify(userId, callback) {
    Limit.findOne({})
      .exec()
      .then((collection) => {
        collection.classify.forEach((history) => {
          if (history._id == userId) {
            callback(history);
          }
        });
      });
  }
  findLimitFetchHistory(userId, callback) {
    Limit.findOne({})
      .exec()
      .then((collection) => {
        collection.fetchHistory.forEach((history) => {
          if (history._id == userId) {
            callback(history);
          }
        }); //kal raat ko kya idea aaya th? call karu kya... ok
      });
  }
  findVideo(vidId) {
    return Video.findOne({ _id: vidId }).exec();
    // .then((video) => callback(video));
  }

  decFetchRemaining(userId, callback) {
    Limit.findOne({})
      .exec()
      .then((limits) => {
        if (
          limits.fetchHistory.filter((limit) => {
            return limit._id === userId;
          }).length !== 0
        ) {
          limits.fetchHistory.filter((limit) => {
            return limit._id === userId;
          })[0].remaining -= 1;
          limits.save();
        } else {
          console.log("no user id found in fetchHistory");
        }
        limits.save().then(() => {
          callback();
        });
      });
  }

  decClassifyRemaining(userId, callback) {
    Limit.findOne({})
      .exec()
      .then((limits) => {
        if (
          limits.classify.filter((limit) => {
            return limit._id === userId;
          }).length !== 0
        ) {
          console.log(
            "classify",
            limits.classify.filter((limit) => {
              return limit._id === userId;
            })[0]
          );
          limits.classify.filter((limit) => {
            return limit._id === userId;
          })[0].remaining -= 1;
        } else {
          console.log("no user id found in Classify");
        }
        limits.save().then(() => {
          callback();
        });
      });
  }

  remove(collection, id, callback) {}

  update(collection, id, data, callback) {}
}

module.exports = DeepfakeDB;
