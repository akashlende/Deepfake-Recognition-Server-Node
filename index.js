const express = require("express");
const morgan = require("morgan"); // used for logging to console
const multer = require("multer"); // used to process formdata. Helps to download video file here
const path = require("path");
const ffmpeg = require("fluent-ffmpeg"); // for processing and getting information on video files
const uniqueFilename = require("unique-filename");
const bodyParser = require("body-parser");

const ServeTwitter = require("./twitter/ServeTwitter");

const serveTwitter = new ServeTwitter();

const port = process.env.PORT || 3000;
const timeInMinutes = 1;
const MaxFileSizeinMB = 100;
const MaxPlaybackTimeInMins = 1;
const MaxFPSAllowed = 30;

const app = express();
app.use(bodyParser.json());
app.use(morgan("dev"));

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "twitter\\video-cache\\");
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

app.post("/api/search", serveTwitter.sendTweets);

app.post("/classify", (req, res, next) => {
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
			ffmpeg.ffprobe(`twitter\\video-cache\\${fileName}`, (err, metadata) => {
				if (err)
					// Errors related to ffprobe will be handled here
					console.log(err);
				else {
					let streamFlag = false;
					for (let i = 0; i < metadata.streams.length; i++) {
						let stream = metadata.streams[i];
						if (stream.codec_type === "video") {
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
						deepfakeDB.findUser(req.body.userId, (user) => {
							if (user.remaining <= 0) {
								res.statusCode = 429;
								res.setHeader("Content-Type", "application/json");
								res.send({ code: 429, message: "Rate limit exceeded" });
							} else {
								// TODO: Video Processing here
								res.statusCode = 200;
								res.setHeader("Content-Type", "application/json");
								res.send({
									code: 200,
									message: "Video processed successfully!",
								});
							}
						});
					}
				}
			});
		}
	});
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
	setInterval(() => {
		// serveTwitter.listenForTweets();
	}, timeInMinutes * 60 * 1000);
	serveTwitter.listenForTweets();
});
