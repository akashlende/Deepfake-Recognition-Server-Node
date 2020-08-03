const express = require("express");
const bodyParser = require("body-parser");
const deepfakeDB = require("../database/DeepfakeDB");
const authenticate = require("../auth/authenticate");

const fetchHistory = express.Router();
fetchHistory.use(bodyParser.json());

fetchHistory.post("/", authenticate.verifyUser, (req, res, next) => {
    deepfakeDB.findUser(req.body.userId, (user) => {
        console.log(user);
        if (user) {
            deepfakeDB.findLimitFetchHistory(user._id, (rate) => {
                if (rate.remaining > 0) {
                    res.statusCode = 200;
                    let data = {
                        id: req.body.userId,
                        twitterid: user.tweet_id,
                        vid: user.videos,
                        img: user.images,
                        remaining: rate.remaining - 1,
                    };

                    let vdata = [];
                    let idata = [];
                    let cdata = [];

                    for (let i = 0; i < user.videos.length; i++) {
                        let video = user.videos[i];
                        deepfakeDB.findVideo(video._id).then((value) => {
                            vdata.push(value);
                        });
                    }

                    for (let i = 0; i < user.images.length; i++) {
                        let image = user.images[i];

                        deepfakeDB.findImage(image._id).then((value) => {
                            idata.push(value);
                        });
                    }

                    for (let i = 0; i < user.complains.length; i++) {
                        let complain = user.complains[i];

                        deepfakeDB.findComplain(complain._id).then((value) => {
                            console.log("------------>", cdata, value)

                            cdata.push(value);
                        });
                    }

                    deepfakeDB.decFetchRemaining(rate._id, () => {
                        res.setHeader("Content-Type", "application/json");
                        res.send({
                            code: 200,
                            message: "User found",
                            data,
                            vdata,
                            idata,
                            cdata
                        });
                    });
                } else {
                    res.statusCode = 429;
                    res.setHeader("Content-Type", "application/json");
                    res.send({ code: 429, message: "Rate limit exceeded" });
                }
            });
        } else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.send({ code: 404, message: "user not found" });
        }
    });
});

module.exports = fetchHistory;
