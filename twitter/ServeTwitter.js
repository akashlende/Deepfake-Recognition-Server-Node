const process = require("process");
const execFile = require("child_process").execFile;
const axios = require("axios");
const DeepfakeDB = require("../database/DeepfakeDB");
const downloadVideo = require("./classify").downloadVideo;

const AUTH_PATH = "..\\requests\\auth.json";

const deepfakeDB = new DeepfakeDB();

function millisToMinutesAndSeconds(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return (
    minutes + " minutes and " + (seconds < 10 ? "0" : "") + seconds + " seconds"
  );
}

class ServeTwitter {
  constructor() {
    console.log("Instance of ServeTwitter created.");
    deepfakeDB.connect();
    this.sendTweets = this.sendTweets.bind(this);
    // console.log(millisToMinutesAndSeconds(140000));
  }

  /**
   *
   *
   *
   * @param {callback} response - Gives object with userId, tweetId, timestamp, url.
   */
  fetchTweets(params, callback) {
    axios({
      method: "GET",
      url:
        /*"http://localhost:3001/1.1/search/tweets.json",*/ "https://api.twitter.com/1.1/search/tweets.json",
      params: params,
      headers: {
        Authorization: `Bearer ${require(AUTH_PATH).oauth2token}`,
      },
    })
      .then((value) => {
        const tweets = value.data.statuses;
        let response = [];
        tweets.forEach((tweet) => {
          if (tweet.extended_entities !== undefined) {
            let temp = {};
            temp.created_at = tweet.created_at;
            temp.tweet_id = tweet.id_str;
            temp.userId = tweet.user.id_str;
            temp.screen_name = tweet.user.screen_name;

            const variants =
              tweet.extended_entities.media[0].video_info.variants;
            let brList = [];
            variants.forEach((variant) => {
              if (variant.bitrate == undefined) brList.push(-1);
              else brList.push(variant.bitrate);
            });
            let j = brList.indexOf(-1);
            if (j != -1) brList[j] = Math.max(...brList) - 1;

            // * Change max to min if you want lower quality video
            let i = brList.indexOf(Math.max(...brList));
            temp.url = variants[i].url;
            temp.tweetUrl = tweet.entities.media.url;
            response.push(temp);
          } else {
            let message = ` 
            Your latest tweet is not being 
            classified as the tweet contains no video. \n\n
            
            *Daily limit will reset at 23:59:59 hours according to Indian Standard Time.\n
          `;
            this.directMessageUser(tweet.id_str, message);
          }
        });

        if (callback) callback(response);
      })
      .catch((reason) => {
        console.log("ERR: " + reason);
      }); // rukh aisa mat delete kar ab?
  }
  listenForTweets() {
    axios({
      method: "POST",
      url: "http://localhost:3000/api/search",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        q: "@theSentinels_20",
      }),
    });
  }

  sendTweets(req, res) {
    this.fetchTweets(req.body, (tweets) => {
      if (tweets.length === 0) {
        console.log(req.body);
        res.statusCode = 200;
        res.end(`There aren't any tweets to process.`);
      }

      tweets.forEach((tweet) => {
        deepfakeDB.findUser(tweet.userId, (user) => {
          if (user == null) {
            console.log("user: ..............", user);
            deepfakeDB.insert(
              "users",
              {
                _id: tweet.userId,
                email: "",
                name: tweet.screen_name,
                password: "",
                twitterUserId: tweet.tweet_id, //ismei kya err hai? pata nahi
                name: tweet.screen_name,
                videos: [],
              },
              (user) => {
                console.log("user: ..............", user);
                deepfakeDB.insert(
                  "limits-classify",
                  { _id: user._id, limit: 10, remaining: 10 },
                  () => {
                    this.processVideo(tweet);
                  }
                );
              }
            );
          } else {
            deepfakeDB.findLimitClassify(user._id, (data) => {
              if (data.remaining > 0) {
                this.processVideo(tweet);
              } else {
                let message = ` 
                  Your latest tweet "${tweet.tweetUrl}" is not being 
                  classified as your daily limit for classification 
                  is over. \n\n

                  *Daily limit will reset at 23:59:59 hours Indian Standard Time.\n
                `;
                this.directMessageUser(user.twitterUserId, message);
              }
            });
          }
        });
      });
    });
  }

  processVideo(tweet) {
    downloadVideo(tweet)
      .then((result) => {
        deepfakeDB.insert(
          // TODO: timestamps
          "videos",
          {
            filePath: result.video_result.filePath,
            status: result.video_result.majority,
            realToFakeRatio: result.video_result.realPercent,
            fileChecksum: "",
            timestamps: [],
            confidence: result.video_result.confidence,
            timeToProcess: result.time_to_process,
            videoExists: "true",
          },
          (video) => {
            console.log(
              `${tweet.screen_name}'s tweet took ${result.time_to_process}milliseconds`
            );
            deepfakeDB.insert(
              "tweets",
              {
                _id: tweet.tweet_id,
                userID: user._id,
                VideoId: video._id,
              },
              (tweet) => {
                deepfakeDB.insertUserVideo(
                  tweet.userID,
                  {
                    _id: video._id,
                    feedback: "",
                    tweetId: tweet._id,
                  },
                  (user) => {
                    deepfakeDB.decClassifyRemaining(user._id, (rate) => {
                      console.log("decrement done");
                      let message = `
                        Thank you for using DeepFake Recognition API by The Sentinels.\n
                        (${rate.remaining}/${rate.limit} API Calls remaining) \n
                        *Daily limit will reset at 23:59:59 hours Indian Standard Time.\n\n

                        For complete report and more features visit our home page.\n
                      `;
                      this.directMessageUser(user.twitterUserId, message);
                      this.commentOnTweet(
                        tweet._id,
                        video.confidence,
                        video.timestamps,
                        video.status == "REAL" ? true : false
                      );
                    });
                  }
                );
              }
            );
          }
        );
        res.setHeader("Content-Type", "application/json");
        res.send({
          code: 200,
          message: "User found",
          videos,
          users,
          tweets,
        });
      })
      .catch((reason) => {
        console.log(reason);
      });
  }

  /**
   * @param {string} recipient_id - Twitter ID
   * @param {Number} message - Message for recepient
   * @returns {boolean} - True for successfull DM, else False
   */
  directMessageUser(recipient_id, message) {
    // console.log("Direct Messaging User ...");
    execFile(
      `./requests/dm/dist/${
        process.platform == "win32"
          ? "dm.exe"
          : process.platform == "darwin"
          ? "dm_mac"
          : "dm"
      }`,
      ["--recepient", recipient_id, "--message", message, "--auth", AUTH_PATH],
      (err, stdout, stderr) => {
        if (err) return false;
        else if (stdout === "200") return true;
        return false;
      }
    );
  }

  /**
   *
   * @param {string} tweetId - Tweet ID to comment to
   * @param {number} confidence - Confidence of prediction
   * @param {string array} timestamps - Timestamps for frames detected fake
   * @param {boolean} isReal - Boolean value true for Video real, else false
   * @returns {boolean} True for successfull comment, else False
   */
  commentOnTweet(tweetId, confidence, timestamps, isReal) {
    // console.log("Commenting on user tweet ...");
    let stamps = "[";
    for (let i = 0; i < timestamps.length; i++) {
      stamps += timestamps[i];
      if (i < timestamps.length - 1) stamps += ",";
    }
    stamps += "]";
    execFile(
      `./requests/comment/dist/${
        process.platform == "win32"
          ? "comment.exe"
          : process.platform == "darwin"
          ? "comment_mac"
          : "comment"
      }`,
      [
        "--tweetId",
        tweetId,
        "--status",
        isReal,
        "--confidence",
        confidence,
        "--timestamp",
        stamps,
        "--auth",
        AUTH_PATH,
      ],
      (err, stdout, stderr) => {
        if (err) return false;
        else if (stdout === "200") return true;
        else return false;
      }
    );
  }
}

module.exports = ServeTwitter;
