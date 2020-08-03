const express = require("express");
const deepfakeDB = require("../database/DeepfakeDB");
const authenticate = require("../auth/authenticate");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const videoRouter = express.Router();
videoRouter.use(bodyParser.json());

videoRouter.get("/", authenticate.verifyUser, (req, res, next) => {
	const userId = req.query.userId;
	const videoId = req.query.videoId;
	deepfakeDB.findLimitfetchVideoPath(userId, (rate) => {
		if (rate.remaining <= 0) {
			res.statusCode = 429;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 429, message: "Rate limit exceeded" });
		} else {
			deepfakeDB.decfetchVideoPath(userId, () => {
				console.log("decrement done");
				deepfakeDB.findUser(userId, (user) => {
					if (user !== null) {
						deepfakeDB.findVideo(videoId).then((video) => {
							if (video !== null) {
								const v = user.videos.filter(
									(video) => video._id === videoId
								);
								if (v.length !== 0) {
									res.statusCode = 200;
									res.setHeader(
										"Content-Type",
										"application/json"
									);
									let file = path.parse(video.filePath);
									res.send({
										code: 200,
										videoFile: file.base,
									});
								} else {
									res.statusCode = 403;
									res.setHeader(
										"Content-Type",
										"application/json"
									);
									res.send({
										code: 403,
										message: "Video doesn't belong to user",
										success: false,
									});
								}
							} else {
								res.statusCode = 404;
								res.setHeader(
									"Content-Type",
									"application/json"
								);
								res.send({
									code: 404,
									message: "Video not found",
									success: false,
								});
							}
						});
					} else {
						res.statusCode = 404;
						res.setHeader("Content-Type", "application/json");
						res.send({
							code: 404,
							message: "User not found",
							success: false,
						});
					}
				});
			});
		}
	});
});

videoRouter.get("/video", (req, res, next) => {
	if (req.query.videoFile === "") {
		res.statusCode = 403;
		res.setHeader("Content-Type", "application/json");
		res.send({
			message: "Video not provided",
			success: false,
		});
	} else {
		const filePath = path.join(
			"video-results",
			"video",
			req.query.videoFile
		);
		const stat = fs.statSync(filePath);
		const fileSize = stat.size;
		const range = req.headers.range;
		if (range) {
			const parts = range.replace(/bytes=/, "").split("-");
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunksize = end - start + 1;
			const file = fs.createReadStream(filePath, { start, end });
			const head = {
				"Content-Range": `bytes ${start}-${end}/${fileSize}`,
				"Accept-Ranges": "bytes",
				"Content-Length": chunksize,
				"Content-Type": "video/mp4",
			};
			res.writeHead(206, head);
			file.pipe(res);
		} else {
			const head = {
				"Content-Length": fileSize,
				"Content-Type": "video/mp4",
			};
			res.writeHead(200, head);
			fs.createReadStream(filePath).pipe(res);
		}
	}
});

module.exports = videoRouter;
