const fs = require("fs");
const URL = require("url").URL;
const uniqueFilename = require("unique-filename");
const axios = require("axios");
const { performance } = require("perf_hooks");
const download = require("download");
const path = require("path");
const FormData = require("form-data");
const { flask_url } = require("../auth/config");

const classify = (filePath) => {
	let promise = new Promise((resolve, reject) => {
		let start = performance.now();
		const formData = new FormData();
		console.log(filePath);
		formData.append("video", fs.createReadStream(filePath));
		axios({
			method: "post",
			url: `${flask_url}/video`,
			headers: {
				...formData.getHeaders(),
			},
			data: formData,
		})
			.then((res) => {
				let end = performance.now();
				response = JSON.parse(JSON.stringify(res.data));
				let videoResult = response.data;
				videoResult.time_to_process = end - start;
				let ext = path.extname(filePath);
				ext = ext.split(".")[1];
				let file = path.parse(filePath);
				download(`${flask_url}/video?type=${ext}`).then((buffer) => {
					fs.writeFileSync(
						path.join("video-results", "video", file.name + "." + ext),
						buffer
					);
					resolve(videoResult);
				});
			})
			.catch((err) => reject(err));
	});
	return promise;
};

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
