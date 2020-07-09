const express = require("express");
const bodyParser = require("body-parser");
const deepfakeDB = require("../database/DeepfakeDB");
//const passport = require("passport");
const authenticate = require("../auth/authenticate");
//const User = require("../database/models/user");
const removeHistory = express.Router();
removeHistory.use(bodyParser.json());

removeHistory.post("/", authenticate.verifyUser, (req, res, next) => {
    const userId = req.body.userId;
    const videoId = req.body.videoId;
    console.log("video", videoId);
    deepfakeDB.findUser(userId, (user) => {
        if (user !== null) {
            if (user.videos.id(videoId) !== null) {
                console.log(user.videos);
                user.videos.id(videoId).remove();
                user.save()
                    .then((user) => {
                        console.log(user);
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json");
                        res.send({ code: 200, message: "deletion successful" });
                    })
                    .catch((err) => {
                        console.log(err);
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json");
                        res.send({ code: 500, message: "server error" });
                    });
            } else {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                res.send({ code: 404, message: "video not found" });
            }
        } else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.send({ code: 404, message: "User not found" });
        }
    });
});

module.exports = removeHistory;
