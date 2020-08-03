const express = require("express");
const ytdl = require("ytdl-core");
const uniqueFilename = require("unique-filename");
const authenticate = require("../auth/authenticate");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const FormData = require("form-data");
const deepfakeDB = require("../database/DeepfakeDB")
const classify = require("../twitter/classify").classify;


const youtubeRouter = express.Router();
youtubeRouter.use(bodyParser.json());

youtubeRouter.post("/", authenticate.verifyUser, (req, res, next) => {
	const URL = req.body.youtubeLink;
	const u_name = uniqueFilename("", "video-youtube");
	const videoPath = path.join(
		__dirname,
		"..",
		"video-cache",
		u_name + ".mp4"
	);
	const videoStream = fs.createWriteStream(videoPath);
	ytdl(URL, {
		format: "mp4",
		quality: "18",
	}).pipe(videoStream);
	deepfakeDB.findLimitClassify(req.body.userId, (rate) => {
		if (rate.remaining <= 0) {
			res.statusCode = 429;
			res.setHeader("Content-Type", "application/json");
			res.send({
				code: 429,
				message: "Rate limit exceeded",
			});
		} else {
			deepfakeDB.decClassifyRemaining(req.body.userId, () => {
				console.log("decrement done");
				res.statusCode = 200;
				res.setHeader("Content-Type", "application/json");
				res.send({
					code: 200,
					message: "YouTube Video is being processed ",
				});
				classify(videoPath)
					.then((result) => {
						console.log(result);
						let data = {
							fileName: u_name + ".mp4",
							filePath: path.join(
								"video-results",
								"video",
								u_name + ".mp4"
							),
							videoExists: exist,
							timeToProcess: result.time_to_process,
							confidence: result.confidence,
							realToFakeRatio:
								result.real_percent / result.fake_percent,
							status: result.majority,
							fileChecksum: checksum,
							duration: duration,
							bitrate: bitrate,
							fileSize: fileSize.size,
						};
						deepfakeDB.insert("videos", data, (video) => {
							let dd = {
								_id: video._id,
								feedback: "",
								tweetId: "",
							};

							deepfakeDB.insertUserVideo(
								req.body.userId,
								dd,
								(user) => {
									console.log("vid inserted in db ");
									console.log(user);
								}
							);
						});
					})
					.catch((err) => console.log(err.message));
			});
		}
	});
});

module.exports = youtubeRouter;
