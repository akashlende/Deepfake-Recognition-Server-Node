const process = require("process");
const execFile = require("child_process").execFile;
const axios = require("axios");
const deepfakeDB = require("../database/DeepfakeDB");
const downloadVideo = require("./classify").downloadVideo;
const path = require("path");

const AUTH_PATH = path.join(__dirname, "..", "requests", "auth.json");

function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return (
        minutes +
        " minutes and " +
        (seconds < 10 ? "0" : "") +
        seconds +
        " seconds"
    );
}

class ServeTwitter {
    constructor() {
        console.log("Instance of ServeTwitter created.");
        deepfakeDB.connect();
        this.sendTweets = this.sendTweets.bind(this);
    }

    /**
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
                console.log("Number of tweets found: ", tweets.length);
                for (let i = 0; i < tweets.length; i++) {
                    let tweet = tweets[i];
                    console.log(tweet.extended_entities);
                    response.push(
                        new Promise((resolve, reject) => {
                            deepfakeDB.isTweetProcessed(
                                tweet.id_str,
                                (isProcessed) => {
                                    if (isProcessed == false) {
                                        if (
                                            tweet.extended_entities !==
                                            undefined
                                        ) {
                                            let temp = {};
                                            temp.created_at = tweet.created_at;
                                            temp.tweet_id = tweet.id_str;
                                            temp.userId = tweet.user.id_str;
                                            temp.screen_name =
                                                tweet.user.screen_name;
                                            temp.tweetUrl =
                                                tweet.entities.media[0].url;

                                            const variants =
                                                tweet.extended_entities.media[0]
                                                    .video_info.variants;
                                            let brList = [];
                                            variants.forEach((variant) => {
                                                if (
                                                    variant.bitrate == undefined
                                                )
                                                    brList.push(-1);
                                                else
                                                    brList.push(
                                                        variant.bitrate
                                                    );
                                            });
                                            let j = brList.indexOf(-1);
                                            if (j != -1)
                                                brList[j] =
                                                    Math.max(...brList) - 1;

                                            // * Change max to min if you want lower quality video
                                            let i = brList.indexOf(
                                                Math.max(...brList)
                                            );
                                            temp.url = variants[i].url;
                                            console.log(
                                                "user-found, video-found"
                                            );
                                            resolve(temp);
                                        } else {
                                            // console.log("Tweet without video found!");
                                            deepfakeDB.findUser(
                                                tweet.user.id_str,
                                                (user) => {
                                                    if (user == null) {
                                                        deepfakeDB.createNewUser(
                                                            {
                                                                _id:
                                                                    tweet.user
                                                                        .id_str,
                                                                name:
                                                                    tweet.user
                                                                        .screen_name,
                                                                twitterUserId:
                                                                    tweet.user
                                                                        .id_str,
                                                                username:
                                                                    tweet.user
                                                                        .screen_name,
                                                                email: "none",
                                                                videos: [],
                                                            },
                                                            (user) => {
                                                                deepfakeDB.insert(
                                                                    "tweets",
                                                                    {
                                                                        _id:
                                                                            tweet.id_str,
                                                                        userId:
                                                                            user._id,
                                                                        videoId: null,
                                                                    },
                                                                    () => {
                                                                        console.log(
                                                                            `Your latest tweet is not being classified as the tweet contains no video.`
                                                                        );
                                                                        let message = `Your latest tweet is not being classified as the tweet contains no video.`;
                                                                        this.directMessageUser(
                                                                            tweet
                                                                                .user
                                                                                .id_str,
                                                                            message
                                                                        );
                                                                        resolve(
                                                                            null
                                                                        );
                                                                    }
                                                                );
                                                            }
                                                        );
                                                    } else {
                                                        deepfakeDB.insert(
                                                            "tweets",
                                                            {
                                                                _id:
                                                                    tweet.id_str,
                                                                userId:
                                                                    user._id,
                                                                videoId: null,
                                                            },
                                                            () => {
                                                                console.log(
                                                                    `Your latest tweet is not being classified as the tweet contains no video.`
                                                                );
                                                                let message = `Your latest tweet is not being classified as the tweet contains no video.`;
                                                                this.directMessageUser(
                                                                    tweet.user
                                                                        .id_str,
                                                                    message
                                                                );
                                                                resolve(null);
                                                            }
                                                        );
                                                    }
                                                }
                                            );
                                        }
                                    } else resolve(null);
                                }
                            );
                        })
                    );
                }
                Promise.all(response).then((response) => {
                    response = response.filter((res) => res !== null);
                    let set = [...new Set(response.map((res) => res.userId))];

                    response = response.filter((res) => {
                        let a = set.includes(res.userId);
                        set.pop(res.userId);
                        return a;
                    });
                    console.log("Processing, ", response);
                    if (callback) callback(response);
                });
            })
            .catch((reason) => {
                console.log("ERR: " + reason);
            });
    }
    listenForTweets() {
        axios({
            method: "POST",
            url: "http://deepfake.westus2.cloudapp.azure.com:4000/api/search",
            headers: {
                "Content-Type": "application/json",
            },
            data: JSON.stringify({
                q: "@theSentinels_20",
                count: 100,
            }),
        });
    }

    sendTweets(req, res) {
        // Entry point for serving twitter
        this.fetchTweets(req.body, (tweets) => {
            // Fetch tweets from last week
            if (tweets.length === 0) {
                res.statusCode = 200;
                res.end(`There aren't any tweets to process.`);
            }

            for (let i = 0; i < tweets.length; i++) {
                let tweet = tweets[i];
                if (tweet !== null) {
                    deepfakeDB.findTwitterUser(tweet.userId, (user) => {
                        if (user == null) {
                            // If user does not exist create one
                            let userData = {
                                _id: tweet.userId,
                                email: "none",
                                name: tweet.screen_name,
                                username: tweet.screen_name,
                                password: "",
                                twitterUserId: tweet.userId,
                                videos: [],
                            };
                            deepfakeDB.createNewUser(userData, (user) => {
                                // Process the video
                                this.processVideo(tweet, user);
                            });
                        } else {
                            // If user already exists
                            deepfakeDB.findLimitClassify(user._id, (data) => {
                                if (data.remaining > 0) {
                                    // Process the video if user limit is not exhausted
                                    this.processVideo(tweet, user);
                                } else {
                                    // DM user about API limit exhausted
                                    deepfakeDB.insert(
                                        "tweets",
                                        {
                                            _id: tweet.tweet_id,
                                            userId: user._id,
                                            videoId: null,
                                            processed: false,
                                        },
                                        () => {
                                            let message = `Your latest tweet ${tweet.tweetUrl} is not being classified as your daily limit for classification is over. \n\n*Daily limit will reset at 23:59:59 hours Indian Standard Time.\n`;
                                            this.directMessageUser(
                                                user.twitterUserId,
                                                message
                                            );
                                        }
                                    );
                                }
                            });
                        }
                    });
                }
            }
        });
    }

    processVideo(tweet, user) {
        // Download video, classify it and get results
        downloadVideo(tweet) //
            .then((result) => {
                // Insert results for the video in database
                deepfakeDB.insert(
                    // TODO: add timestamps once ML model is improved.
                    "videos",
                    {
                        filePath: result.filePath,
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
                            `${
                            tweet.screen_name
                            }'s tweet took ${millisToMinutesAndSeconds(
                                result.time_to_process
                            )}`
                        );
                        // Insert results for the tweet in the database
                        deepfakeDB.insert(
                            "tweets",
                            {
                                _id: tweet.tweet_id,
                                userId: user._id,
                                videoId: video._id,
                                processed: true,
                            },
                            (tweet) => {
                                // Insert video and tweet details in user collection
                                deepfakeDB.insertUserVideo(
                                    tweet.userId,
                                    {
                                        _id: video._id,
                                        feedback: "",
                                        tweetId: tweet._id,
                                    },
                                    (user) => {
                                        // Decrement the user API limit for classification
                                        deepfakeDB.decClassifyRemaining(
                                            user._id,
                                            (rate) => {
                                                // DM the user about API limit and comment on tweet with results
                                                console.log(rate);
                                                let message = `Thanks for using DeepFake Recognition API by The Sentinels.\n(${rate.remaining}/${rate.limit} API Calls remaining) \n*Daily limit will reset at 23:59:59 hours Indian Standard Time.\n\nFor complete report and more features visit our home page.\n`;

                                                this.directMessageUser(
                                                    user.twitterUserId,
                                                    message
                                                );
                                                this.commentOnTweet(
                                                    tweet._id,
                                                    video.confidence,
                                                    [2, 3, 5, 6],
                                                    video.status == "REAL"
                                                        ? true
                                                        : false
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            })
            .catch((reason) => {
                console.log("errr reason", reason);
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
            [
                "--recepient",
                recipient_id,
                "--message",
                message,
                "--auth",
                "./requests/auth.json",
            ],
            (err, stdout, stderr) => {
                // console.log("dm");
                // console.log("err : ", err);
                // console.log("stdout : ", stdout);
                // console.log("stderr : ", stderr);
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
        // console.log(tweetId + ": comment");
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
                "./requests/auth.json",
            ],
            (err, stdout, stderr) => {
                // console.log("comment");
                // console.log("err : ", err);
                // console.log("stdout : ", stdout);
                // console.log("stderr : ", stderr);
                if (err) return false;
                else if (stdout === "200") return true;
                else return false;
            }
        );
    }
}

module.exports = ServeTwitter;
