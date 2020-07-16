const express = require("express");
const bodyParser = require("body-parser");
const authenticate = require("../auth/authenticate");
const path = require("path");
const multer = require("multer");
const uniqueFilename = require("unique-filename");
const deepfakeDB = require("../database/DeepfakeDB");
const { performance } = require("perf_hooks");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");

const imageRouter = express.Router();

const pythonExec = "python";

imageRouter.use(bodyParser.json());

const DIR = path.join("images", "cache");

let actualFileName = "";
let fileName = "";

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, DIR);
	},
	filename: (req, file, cb) => {
		const uniqueFileName = uniqueFilename("", "image");
		actualFileName = file.originalname;
		fileName = uniqueFileName + path.extname(file.originalname);
		cb(null, fileName);
	},
});

let upload = multer({
	storage: storage,
	fileFilter: (req, file, cb) => {
		if (
			file.mimetype == "image/png" ||
			file.mimetype == "image/jpg" ||
			file.mimetype == "image/jpeg"
		) {
			cb(null, true);
		} else {
			cb(null, false);
			return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
		}
	},
});

imageRouter.post(
	"/",
	authenticate.verifyUser,
	upload.single("image"),
	(req, res, next) => {
		if (req.file === undefined) {
			res.statusCode = 400;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 400, message: `No image found` });
		} else {
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
							message: "Image is being processed",
						});
						classifyImage(req.file.path)
							.then((result) => {
								let data = {
									fileName: actualFileName,
									filePath: path.join("images", "results", fileName),
									timeToProcess: result.time_to_process,
									confidence: result.confidence,
									status: result.status,
								};

								deepfakeDB.insert("images", data, (image) => {
									let dd = {
										_id: image._id,
										feedback: "",
										tweetId: "",
									};

									deepfakeDB.insertUserImage(req.body.userId, dd, (user) => {
										console.log("image inserted in db ");
										console.log(user);
									});
								});
							})
							.catch((err) => console.log(err));
					});
				}
			});
		}
	}
);

imageRouter.get("/", authenticate.verifyUser, (req, res, next) => {
	const userId = req.query.userId;
	const imageId = req.query.imageId;

	deepfakeDB.findUser(userId, (user) => {
		if (user !== null) {
			deepfakeDB.findImage(imageId).then((image) => {
				if (image !== null) {
					const v = user.images.filter((image) => image._id === imageId);
					if (v.length !== 0) {
						res.statusCode = 200;
						res.setHeader("Content-Type", "application/json");
						let file = path.parse(image.filePath);
						res.send({ code: 200, imageFile: file.base });
					} else {
						res.statusCode = 403;
						res.setHeader("Content-Type", "application/json");
						res.send({
							code: 403,
							message: "Image doesn't belong to user",
							success: false,
						});
					}
				} else {
					res.statusCode = 404;
					res.setHeader("Content-Type", "application/json");
					res.send({ code: 404, message: "Image not found", success: false });
				}
			});
		} else {
			res.statusCode = 404;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 404, message: "User not found", success: false });
		}
	});
});

imageRouter.get("/image", (req, res, next) => {
	if (req.query.imageFile === "") {
		res.statusCode = 403;
		res.setHeader("Content-Type", "application/json");
		res.send({
			message: "Image not provided",
			success: false,
		});
	} else {
		const filePath = path.join("images", "results", req.query.imageFile);
		res.statusCode = 200;
		let file = fs.createReadStream(filePath);
		file.pipe(res);
	}
});

const classifyImage = (filePath) => {
	let promise = new Promise((resolve, reject) => {
		let start = performance.now();
		let modelPath = path.join("model", "full_raw.p");
		exec(
			`${pythonExec} -W ignore predict.py -m ${modelPath} -i ${filePath} --cuda`
		)
			.then((value) => {
				let end = performance.now();
				let file = path.parse(filePath);
				const resultFile = fs.readFileSync(
					path.join("images", "json", file.name + ".json")
				);
				const data = JSON.parse(resultFile.toString());
				let imageResult = parseImageData(data);
				imageResult.time_to_process = end - start;
				resolve(imageResult);
			})
			.catch((err) => reject(err));
	});
	return promise;
};

const parseImageData = (data) => {
	const result = data.result;
	let realCount = 0;
	let fakeCount = 0;
	result.forEach((face) => {
		if (face == 0) realCount += 1;
		else fakeCount += 1;
	});

	const realPercent = Math.round((realCount / result.length) * 100);
	const fakePercent = Math.round((fakeCount / result.length) * 100);
	const majority = realCount >= fakeCount ? "REAL" : "FAKE";
	return {
		status: majority,
		confidence: majority == "REAL" ? realPercent : fakePercent,
	};
};

module.exports = imageRouter;
