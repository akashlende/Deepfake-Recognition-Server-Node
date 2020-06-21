const fs = require("fs");
const URL = require("url").URL;
const https = require("https");
const http = require("http");
const uniqueFilename = require("unique-filename");
const { execSync } = require("child_process");

const pythonExec = "python";

const classify = (filePath) => {
	let promise = new Promise((resolve, reject) => {
		execSync(
			`${pythonExec} -W ignore predict.py -m .\\model\\full_raw.p -i ${filePath} --cuda`
		);
		let temp = file.path.split("\\");
		temp = temp[temp.length - 1];
		const resultFile = fs.readFileSync(
			".\\twitter\\twitter-json\\" + temp.split(".")[0] + ".json"
		);
		const data = JSON.parse(resultFile.toString());
		const videoResult = parseModelOutput(data);
		resolve(videoResult);
	});
	return promise;
};

const downloadVideo = function (tweet) {
	let promise = new Promise((resolve, reject) => {
		let url = new URL(tweet.url);

		const uniqueFileName = uniqueFilename(
			".\\twitter\\twitter-videos",
			"video"
		);
		file = fs.createWriteStream(uniqueFileName + ".mp4");
		console.log("File created:", file.path);

		if (url.protocol === "http:")
			http.get(url, (response) => response.pipe(file));
		else if (url.protocol === "https:")
			https.get(url, (response) => response.pipe(file));

		file.on("finish", async () => {
			console.log("Download finished");
			classify(file.path).then((videoResult) => {
				resolve({
					processed_tweet: tweet,
					video_result: videoResult,
				});
			});
		});
	});
	return promise;
};

const parseModelOutput = (data) => {
	const frames = data.frames;
	const fps = data.fps;
	let realCount = 0;
	let fakeCount = 0;
	frames.forEach((frame) => {
		if (frame == 0) realCount += 1;
		else fakeCount += 1;
	});

	const realPercent = Math.round((realCount / frames.length) * 100);
	const fakePercent = Math.round((fakeCount / frames.length) * 100);
	const majority = realCount >= fakeCount ? "REAL" : "FAKE";

	// TODO: Retrieve timestamps
	// TODO: Retrieve confidence scores
	return {
		frameCount: frames.length,
		realPercent: realPercent,
		fakePercent: fakePercent,
		majority: majority,
		fps: fps,
	};
};

module.exports = downloadVideo;
exports.classify = classify;
