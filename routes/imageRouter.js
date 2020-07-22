const express = require("express");
const bodyParser = require("body-parser");
const authenticate = require("../auth/authenticate");
const path = require("path");
const multer = require("multer");
const axios = require("axios");
const uniqueFilename = require("unique-filename");
const deepfakeDB = require("../database/DeepfakeDB");
const { performance } = require("perf_hooks");
const util = require("util");
const FormData = require("form-data");
const download = require("download");
const { flask_url } = require("../auth/config");
const fs = require("fs");
const crypto = require("crypto");

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
		let extension = path.extname(file.originalname);
		if (extension == ".png" || extension == ".jpg" || extension == ".jpeg") {
			cb(null, true);
		} else {
			cb(null, false);
			return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
		}
	},
});

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

imageRouter.post(
	"/",
	authenticate.verifyUser,
	upload.single("image"),
	(req, res, next) => {
		console.log("req", req.body);
		if (req.file === undefined) {
			res.statusCode = 400;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 400, message: `No image found` });
		} else {
			deepfakeDB.findLimitGetImage(req.body.userId, (rate) => {
				if (rate.remaining <= 0) {
					res.statusCode = 429;
					res.setHeader("Content-Type", "application/json");
					res.send({ code: 429, message: "Rate limit exceeded" });
				} else {
					deepfakeDB.decGetImage(req.body.userId, () => {
						console.log("decrement done");
						res.statusCode = 200;
						res.setHeader("Content-Type", "application/json");
						res.send({
							code: 200,
							message: "Image is being processed",
						});
						getChecksum(req.file.path)
							.then((checksum) => {
								console.log("checksum", checksum);
								classifyImage(req.file.path)
									.then((result) => {
										let data = {
											fileName: actualFileName,
											filePath: path.join("images", "results", fileName),
											timeToProcess: result.time_to_process,
											confidence: result.confidence,
											isFacePresent: result.faces_present,
											status: result.majority,
											checksum: checksum,
											size: fs.statSync(req.file.path).size,
										};

										deepfakeDB.insert("images", data, (image) => {
											let dd = {
												_id: image._id,
												feedback: "",
												tweetId: "",
											};

											deepfakeDB.insertUserImage(
												req.body.userId,
												dd,
												(user) => {
													console.log("image inserted in db ");
													console.log(user);
												}
											);
										});
									})
									.catch((err) => console.log(err));
							})
							.catch((err) => {
								res.statusCode = 500;
								res.setHeader("Content-Type", "application/json");
								res.send({
									code: 500,
									message: "Internal server error",
								});
							});
					});
				}
			});
		}
	}
);

imageRouter.get("/", authenticate.verifyUser, (req, res, next) => {
	const userId = req.query.userId;
	const imageId = req.query.imageId;

	deepfakeDB.findLimitfetchImagePath(userId, (rate) => {
		if (rate.remaining <= 0) {
			res.statusCode = 429;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 429, message: "Rate limit exceeded" });
		} else {
			deepfakeDB.decfetchImagePath(userId, () => {
				console.log("decrement done");
				deepfakeDB.findUser(userId, (user) => {
					if (user !== null) {
						deepfakeDB.findImage(imageId).then((image) => {
							if (image.isFacePresent) {
								if (image !== null) {
									const v = user.images.filter(
										(image) => image._id === imageId
									);
									if (v.length !== 0) {
										res.statusCode = 200;
										res.setHeader("Content-Type", "application/json");
										let file = path.parse(image.filePath);
										res.send({
											code: 200,
											imageFile: file.base,
										});
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
									res.send({
										code: 404,
										message: "Image not found",
										success: false,
									});
								}
							} else {
								res.statusCode = 417;
								res.setHeader("Content-Type", "application/json");
								res.send({
									code: 417,
									message: "No face found in image",
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

		file.on("error", (err) => {
			if (err.code == "ENOENT") {
				res.statusCode = 404;
				res.setHeader("Content-Type", "application/json");
				res.send({
					message: "No such image found on server",
					success: false,
				});
			} else {
				res.statusCode = 500;
				res.setHeader("Content-Type", "application/json");
				res.send({
					message: "Internal server error",
					success: false,
				});
			}
		});
	}
});

const classifyImage = (filePath) => {
	let promise = new Promise((resolve, reject) => {
		let start = performance.now();
		const formData = new FormData();
		console.log(filePath);
		formData.append("image", fs.createReadStream(filePath));
		axios({
			method: "post",
			url: `${flask_url}/image`,
			headers: {
				...formData.getHeaders(),
			},
			data: formData,
		})
			.then((res) => {
				let end = performance.now();
				response = JSON.parse(JSON.stringify(res.data));
				let imageResult = response.data;
				imageResult.time_to_process = end - start;
				let ext = path.extname(filePath);
				ext = ext.split(".")[1];
				let file = path.parse(filePath);
				download(`${flask_url}/image?type=${ext}`).then((buffer) => {
					fs.writeFileSync(
						path.join("images", "results", file.name + "." + ext),
						buffer
					);
					resolve(imageResult);
				});
			})
			.catch((err) => reject(err));
	});
	return promise;
};

module.exports = imageRouter;
