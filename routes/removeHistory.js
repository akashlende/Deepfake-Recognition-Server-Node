const express = require("express");
const bodyParser = require("body-parser");
const deepfakeDB = require("../database/DeepfakeDB");

const authenticate = require("../auth/authenticate");

const removeHistory = express.Router();
removeHistory.use(bodyParser.json());

removeHistory.post("/video", authenticate.verifyUser, (req, res, next) => {
    const userId = req.body.userId;
    const videoId = req.body.videoId;
    console.log("video", videoId);
    deepfakeDB.findUser(userId, (user) => {
        if (user) {
            deepfakeDB.findLimitRemoveVideo(user._id, (rate) => {
                if (rate.remaining > 0) {
                    res.statusCode = 200;
                    let data = {
                        id: req.body.userId,
                        twitterid: user.tweet_id,
                        vid: user.video,
                        remaining: rate.remaining - 1,
                    };
                    console.log("video", user.videos);
                    if (user.videos.id(videoId) !== null) {
                        user.videos.id(videoId).remove();
                        deepfakeDB.decRemoveVideo(rate._id, () => {});
                        user.save()
                            .then((user) => {
                                console.log(user);
                                res.statusCode = 200;
                                res.setHeader(
                                    "Content-Type",
                                    "application/json"
                                );
                                res.send({
                                    code: 200,
                                    message: "deletion successful",
                                    success: true,
                                    data,
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                res.statusCode = 500;
                                res.setHeader(
                                    "Content-Type",
                                    "application/json"
                                );
                                res.send({
                                    code: 500,
                                    message: "server error",
                                    success: false,
                                });
                            });
                    } else {
                        res.statusCode = 404;
                        res.setHeader("Content-Type", "application/json");
                        res.send({
                            code: 404,
                            message: "video not found",
                            success: false,
                        });
                    }
                } else {
                    res.statusCode = 429;
                    res.setHeader("Content-Type", "application/json");
                    res.send({ code: 429, message: "Rate limit exceeded" });
                }
            });
        } else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.send({ code: 404, message: "User not found", success: false });
        }
    });
});

removeHistory.post("/image", authenticate.verifyUser, (req, res, next) => {
    const userId = req.body.userId;
    const imageId = req.body.imageId;
    console.log("image", imageId);
    deepfakeDB.findUser(userId, (user) => {
        if (user) {
            deepfakeDB.findLimitRemoveImage(user._id, (rate) => {
                if (rate.remaining > 0) {
                    res.statusCode = 200;
                    let data = {
                        id: req.body.userId,
                        twitterid: user.tweet_id,
                        vid: user.image,
                        remaining: rate.remaining - 1,
                    };

                    if (user.images.id(imageId) !== null) {
                        user.images.id(imageId).remove();

                        deepfakeDB.decRemoveImage(rate._id, () => {});
                        user.save()
                            .then((user) => {
                                console.log(user);
                                res.statusCode = 200;
                                res.setHeader(
                                    "Content-Type",
                                    "application/json"
                                );
                                res.send({
                                    code: 200,
                                    message: "deletion successful",
                                    success: true,
                                    data,
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                res.statusCode = 500;
                                res.setHeader(
                                    "Content-Type",
                                    "application/json"
                                );
                                res.send({
                                    code: 500,
                                    message: "server error",
                                    success: false,
                                });
                            });
                    } else {
                        res.statusCode = 404;
                        res.setHeader("Content-Type", "application/json");
                        res.send({
                            code: 404,
                            message: "image not found",
                            success: false,
                        });
                    }
                } else {
                    res.statusCode = 429;
                    res.setHeader("Content-Type", "application/json");
                    res.send({ code: 429, message: "Rate limit exceeded" });
                }
            });
        } else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.send({ code: 404, message: "User not found", success: false });
        }
    });
});

module.exports = removeHistory;
