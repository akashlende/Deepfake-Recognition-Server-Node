const express = require("express");
const ytdl = require("ytdl-core");
const uniqueFilename = require("unique-filename");
const authenticate = require("../auth/authenticate");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const Axios = require("axios");
const FormData = require("form-data");
const ExtractJwt = require("passport-jwt").ExtractJwt;

const youtubeRouter = express.Router();
youtubeRouter.use(bodyParser.json());

youtubeRouter.post("/", authenticate.verifyUser, (req, res, next) => {
	const URL = req.body.youtubeLink;
	const uniqueFileName = uniqueFilename("", "video-youtube");
	const videoPath = path.join(
		__dirname,
		"..",
		"video-cache",
		uniqueFileName + ".mp4"
	);
	const videoStream = fs.createWriteStream(videoPath);
	const token = ExtractJwt.fromAuthHeaderAsBearerToken();
	ytdl(URL, {
		format: "mp4",
		quality: "18",
	}).pipe(videoStream);
	const data = new FormData()
	data.append("userId", req.body.userId);
	data.append("video", fs.createReadStream(videoPath));
	const config = {
		method: "post",
		url: "https://deepfake.westus2.cloudapp.azure.com/classify",
		headers: {
			...data.getHeaders(),
			Authorization: `Bearer ${token(req)}`,
		},
		data: data,
	};
	Axios(config).then((response) => {
		res.json(response.data);
		// fs.unlink(videoPath);
	});
});

module.exports = youtubeRouter;
