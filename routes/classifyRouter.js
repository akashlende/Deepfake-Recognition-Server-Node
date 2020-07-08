const express = require("express");
const classify = require("../twitter/classify").classify;
const deepfakeDB = require("../database/DeepfakeDB");
const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer"); // used to process formdata. Helps to download video file here
const path = require("path");
const ffmpeg = require("fluent-ffmpeg"); // for processing and getting information on video files
const uniqueFilename = require("unique-filename");
const authenticate = require("../auth/authenticate");
const MaxFileSizeinMB = 100;
const MaxPlaybackTimeInMins = 1;
const MaxFPSAllowed = 30;

const classifyRouter = express.Router();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "video-cache\\");
	},

	filename: (req, file, cb) => {
		const uniqueFileName = uniqueFilename("", "video");
		cb(null, uniqueFileName + path.extname(file.originalname));
	},
});

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * MaxFileSizeinMB,
	},
}).single("video");

function getChecksum(path) {
	return new Promise(function (resolve, reject) {
		const hash = crypto.createHash("md5");
		const input = fs.createReadStream(path);
		input.on("error", reject);
		input.on("data", function (chunk) {
			hash.update(chunk);
		});

		input.on("close", function () {
			resolve(hash.digest("hex"));
		});
	});
}

classifyRouter.post("/", authenticate.verifyUser, (req, res, next) => {
	console.log("classify");
	upload(req, res, (err) => {
		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				res.statusCode = 412;
				res.setHeader("Content-Type", "application/json");
				res.send({
					code: 412,
					message: `Size of file exceeded max permissible size of ${MaxFileSizeinMB}MB`,
					field: err.field,
				});
			}
		} else if (err) {
			// Errors unrelated to multer occurred when uploading are handled here.
		} else {
			let errFlag = false;
			let n = req.file.path.split("\\").length;
			let fileName = req.file.path.split("\\")[n - 1];
			getChecksum(req.file.path)
				.then((value) => {
					console.log("Checksum : " + value);
					const checksum = value;
					let duration = 0;
					let bitrate = 0;
					let fileSize = 0;

					ffmpeg.ffprobe(`video-cache\\${fileName}`, (err, metadata) => {
						if (err)
							// Errors related to ffprobe will be handled here
							console.log(err);
						else {
							let streamFlag = false;
							for (let i = 0; i < metadata.streams.length; i++) {
								let stream = metadata.streams[i];
								if (stream.codec_type === "video") {
									exist = true;
									duration = stream.duration;
									bitrate = stream.nb_frames;
									fileSize = fs.statSync(`video-cache\\${fileName}`);
									console.log(fileSize.size + " bytes");
									if (stream.duration > 60 * MaxPlaybackTimeInMins) {
										res.statusCode = 413;
										res.setHeader("Content-Type", "application/json");
										res.send({
											code: 413,
											message: `Video length should not exceed ${MaxPlaybackTimeInMins} minutes`,
										});
										errFlag = true;
									} else if (
										stream.nb_frames >
										60 * MaxPlaybackTimeInMins * MaxFPSAllowed
									) {
										res.statusCode = 413;
										res.setHesCode = 413;
										res.setHeader("Content-Type", "application/json");
										res.send({
											code: 413,
											message:
												`Total frames in video should not exceed ` +
												`${60 * MaxPlaybackTimeInMins * MaxFPSAllowed} minutes`,
										});
										errFlag = true;
									}
									streamFlag = true;
									break;
								}
							}
							if (!streamFlag) {
								res.statusCode = 422;
								res.setHeader("Content-Type", "application/json");
								res.send({ code: 422, message: `No video codec found` });
								errFlag = true;
							}
							if (!errFlag) {
								// All Error Handled up till here
								deepfakeDB.findLimitClassify(req.body.userId, (rate) => {
									if (rate.remaining <= 0) {
										res.statusCode = 429;
										res.setHeader("Content-Type", "application/json");
										res.send({ code: 429, message: "Rate limit exceeded" });
									} else {
										deepfakeDB.decClassifyRemaining(req.body.userId, () => {
											console.log("decrement done");
											res.statusCode = 200;
											res.setHeader("Content-Type", "application/json");
											res.send({
												code: 200,
												message: "Video is being processed ",
											});
											classify(req.file.path).then((result) => {
												let data = {
													filePath: req.file.path,
													videoExists: exist,
													timeToProcess: result.time_to_process,
													confidence: result.confidence,
													realToFakeRatio: result.realPercent,
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
											});
										});
									}
								});
							}
						}
					});
				})
				.catch(console.error);
		}
	});
});

module.exports = classifyRouter;
