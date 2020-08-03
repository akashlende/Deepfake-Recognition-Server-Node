const fs = require("fs");
const URL = require("url").URL;
const uniqueFilename = require("unique-filename");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg"); // for processing and getting information on video files

const { performance } = require("perf_hooks");
const download = require("download");
const path = require("path");
const FormData = require("form-data");
const { classify_url } = require("../auth/config");
const deepfakeDB = require("../database/DeepfakeDB");
const util = require("util");
const csv = require("csv-parse");

const { execSync } = require("child_process");
const exec = util.promisify(require("child_process").exec);

const classify = (filePath) => {
	let promise = new Promise((resolve, reject) => {
		let start = performance.now();

		execSync(`cp ${filePath} video-cache/temp`);

		ffmpeg.ffprobe(
			filePath,
			(err, metadata) => {
				if (err)
					// Errors related to ffprobe will be handled here
					console.log("FFProbe Related Error");
				else {
					for (let i = 0; i < metadata.streams.length; i++) {
						let stream = metadata.streams[i];
						if (stream.codec_type === "video") {
							let frameCount = stream.nb_frames;
							console.log(frameCount)
							exec(
								`python -W ignore predict_folder.py \
								--weights-dir weights/ \
								--test-dir ./video-cache/temp \
								--output result.csv \
								--models final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36 \
								--frames ${frameCount}`
							)
								.then(() => {
									const parser = csv({ delimiter: "," }, (err, data) => {
										fake_confidence = parseFloat(data[1][1]);
										real_confidence = 1.0 - fake_confidence;
										const majority = fake_confidence > 0.5 ? "FAKE" : "REAL";
										const confidence = majority === "REAL" ? real_confidence : fake_confidence;
										const real_percent = real_confidence;
										const fake_percent = fake_confidence;
										let end = performance.now();
										let response = {
											majority,
											confidence,
											fake_percent,
											real_percent,
											frameCount,
										};

										response.time_to_process = end - start

										fs.unlink(path.join("video-cache", "temp", path.basename(filePath)), (err) => {
											resolve(response);
										})
									})

									fs.createReadStream(
										"result.csv"
									).pipe(parser);

								})
								.catch((err) => reject(err));

						}
					}
				}
			}
		);

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
