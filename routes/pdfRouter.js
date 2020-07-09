const express = require("express");
const bodyParser = require("body-parser");
const deepfakeDB = require("../database/DeepfakeDB");
const authenticate = require("../auth/authenticate");

const pdfGenerator = require("../pdf-generation/generatePdf");

const pdfRouter = express.Router();
pdfRouter.use(bodyParser.json());

pdfRouter.get("/", authenticate.verifyUser, (req, res, next) => {
	const userId = req.query.userId;
	const videoId = req.query.videoId;
	deepfakeDB.findUser(userId, (user) => {
		if (user !== null) {
			deepfakeDB.findVideo(videoId).then((video) => {
				if (video !== null) {
					const v = user.videos.filter((video) => video._id === videoId);
					if (v.length !== 0) {
						const data = {
							userId: user._id,
							videoId: video._id,
							status: video.status,
							ratio: video.realToFakeRatio,
							confidence: video.confidence,
							duration: video.duration,
							checksum: video.fileChecksum,
							bitrate: video.bitrate,
							size: video.fileSize,
						};
						pdfGenerator(data, (path) => {
							res.statusCode = 200;
							res.download(path.filename, "report.pdf");
						});
					} else {
						res.statusCode = 403;
						res.setHeader("Content-Type", "application/json");
						res.send({ code: 403, message: "Video doesn't belong to user" });
					}
				} else {
					res.statusCode = 404;
					res.setHeader("Content-Type", "application/json");
					res.send({ code: 404, message: "Video not found" });
				}
			});
		} else {
			res.statusCode = 404;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 404, message: "User not found" });
		}
	});
});

module.exports = pdfRouter;
