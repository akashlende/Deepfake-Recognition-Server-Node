const fs = require("fs");
const URL = require("url").URL;
const uniqueFilename = require("unique-filename");
const axios = require("axios");
const { performance } = require("perf_hooks");
const download = require("download");
const path = require("path");
const FormData = require("form-data");
const { classify_url } = require("../auth/config");
const ffmpeg = require("fluent-ffmpeg");
const deepfakeDB = require("../database/DeepfakeDB");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const classify = (filePath) => {
	let promise = new Promise((resolve, reject) => {
		let start = performance.now();
		const formData = new FormData();
		console.log(filePath);

		formData.append("video", fs.createReadStream(filePath));
		axios({
			method: "post",
			url: `${classify_url}/video`,
			headers: {
				...formData.getHeaders(),
			},
			data: formData,
		})
			.then((res) => {
				let end = performance.now();
				let videoResult = res.data;
				videoResult.time_to_process = end - start;
				let ext = path.extname(filePath);
				ext = ext.split(".")[1];
				let file = path.parse(filePath);
				download(`${classify_url}/video?videoName=${file.name}.mp4`).then((buffer) => {
					fs.writeFileSync(
						path.join("video-results", "video", file.name + ".mp4"),
						buffer
					);
					resolve(videoResult);
				});
			})
			.catch((err) => reject(err));
	});
	return promise;
};

// function extractAudio(filePath, callback) {
//     let file = path.parse(filePath);
//     let audioPath = path.join(
//         "audio-cache",
//         "audio",
//         "audio-" + file.name.split("-")[1]
//     );
//     return new Promise((resolve, reject) => {
//         exec(
//             `ffmpeg -i ${filePath} -ab 160k -ac 2 -ar 44100 -vn ${
//                 audioPath + ".wav"
//             }`
//         ).then(() => {
//             resolve();
//         });
//     });
// }

async function getVideo(url, path) {
	const writer = fs.createWriteStream(path);

	const response = await axios({
		url,
		method: "GET",
		responseType: "stream",
	});

	response.data.pipe(writer);

	return new Promise((resolve, reject) => {
		writer.on("finish", resolve);
		writer.on("error", reject);
	});
}

const downloadVideo = function (tweet) {
	let promise = new Promise((resolve, reject) => {
		let url = new URL(tweet.url);

		const uniqueFileName = uniqueFilename("video-cache", "video");

		let file = { path: uniqueFileName + ".mp4" };

		console.log("File created:", file.path);

		getVideo(url.toString(), uniqueFileName + ".mp4").then(() => {
			let start = performance.now();
			classify(file.path)
				.then((videoResult) => {
					let end = performance.now();
					const time_taken = end - start;
					resolve({
						filePath: file.path,
						time_to_process: time_taken,
						processed_tweet: tweet,
						video_result: videoResult,
					});
				})
				.catch((err) => reject(err));
		});
	});
	return promise;
};

module.exports = { downloadVideo, classify };
