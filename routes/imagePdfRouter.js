const express = require("express");
const bodyParser = require("body-parser");
const deepfakeDB = require("../database/DeepfakeDB");
const authenticate = require("../auth/authenticate");
const path = require("path");

const pdfGenerator = require("../pdf-generation/generateImagePdf");

const imagePdfRouter = express.Router();
imagePdfRouter.use(bodyParser.json());

imagePdfRouter.get("/", authenticate.verifyUser, (req, res, next) => {
	const userId = req.query.userId;
	const imageId = req.query.imageId;
	deepfakeDB.findgetPdfImage(userId, (rate) => {
		if (rate.remaining <= 0) {
			res.statusCode = 429;
			res.setHeader("Content-Type", "application/json");
			res.send({ code: 429, message: "Rate limit exceeded" });
		} else {
			deepfakeDB.decgetPdfImage(userId, () => {
				console.log("decrement done");
				deepfakeDB.findUser(userId, (user) => {
					if (user !== null) {
						deepfakeDB.findImage(imageId).then((image) => {
							if (image !== null) {
								const v = user.images.filter((image) => image._id === imageId);
								if (v.length !== 0) {
									const data = {
										userId: user._id,
										imageId: image._id,
										status: image.status,
										confidence: image.confidence,
										size: image.size,
										checksum: image.checksum,
										isFacePresent: image.isFacePresent,
									};
									pdfGenerator(data, (filePath) => {
										res.statusCode = 200;
										let file = path.parse(filePath.filename);
										let fileName = file.base;
										res.json({ report: fileName });
									});
								} else {
									res.statusCode = 403;
									res.setHeader("Content-Type", "application/json");
									res.send({
										code: 403,
										message: "Image doesn't belong to user",
									});
								}
							} else {
								res.statusCode = 404;
								res.setHeader("Content-Type", "application/json");
								res.send({
									code: 404,
									message: "Image not found",
								});
							}
						});
					} else {
						res.statusCode = 404;
						res.setHeader("Content-Type", "application/json");
						res.send({ code: 404, message: "User not found" });
					}
				});
			});
		}
	});
});

module.exports = imagePdfRouter;
