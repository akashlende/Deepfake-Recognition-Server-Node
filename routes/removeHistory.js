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
		if (user !== null) {
			if (user.videos.id(videoId) !== null) {
				console.log(user.videos);
				user.videos.id(videoId).remove();
				user
					.save()
					.then((user) => {
						console.log(user);
						res.statusCode = 200;
						res.setHeader("Content-Type", "application/json");
						res.send({
							code: 200,
							message: "deletion successful",
							success: true,
						});
					})
					.catch((err) => {
						console.log(err);
						res.statusCode = 500;
						res.setHeader("Content-Type", "application/json");
						res.send({ code: 500, message: "server error", success: false });
					});
			} else {
				res.statusCode = 404;
				res.setHeader("Content-Type", "application/json");
				res.send({ code: 404, message: "video not found", success: false });
			}
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
		if (user !== null) {
			if (user.images.id(imageId) !== null) {
				console.log(user.images);
				user.images.id(imageId).remove();
				user
					.save()
					.then((user) => {
						console.log(user);
						res.statusCode = 200;
						res.setHeader("Content-Type", "application/json");
						res.send({
							code: 200,
							message: "deletion successful",
							success: true,
						});
					})
					.catch((err) => {
						console.log(err);
						res.statusCode = 500;
						res.setHeader("Content-Type", "application/json");
						res.send({ code: 500, message: "server error", success: false });
					});
			} else {
				res.statusCode = 404;
				res.setHeader("Content-Type", "application/json");
				res.send({ code: 404, message: "Image not found", success: false });
			}
		} else {
			res.statusCode = 404;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 404, message: "User not found", success: false });
		}
	});
});

module.exports = removeHistory;
