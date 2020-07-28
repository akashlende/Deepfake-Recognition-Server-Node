const fs = require("fs");
const URL = require("url").URL;
const uniqueFilename = require("unique-filename");
const axios = require("axios");
const { performance } = require("perf_hooks");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const deepfakeDB = require("../database/DeepfakeDB");

const pythonExec = "python";

const classify = (filePath) => {
    let promise = new Promise((resolve, reject) => {
        let start = performance.now();
        let modelPath = path.join("model", "full_raw.p");
        let file = path.parse(filePath);
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (!err) {
                let isAudioCodecPresent =
                    metadata.streams.filter(
                        (stream) => stream.codec_type == "audio"
                    ).length > 0;

                if (isAudioCodecPresent) {
                    extractAudio(filePath);
                } else {
                    console.log("no audio file found");
                }
            }
        });

        exec(
            `${pythonExec} -W ignore predict.py -m ${modelPath} -i ${filePath} --dev`
        ).then((value) => {
            let end = performance.now();

            const resultFile = fs.readFileSync(
                path.join("video-results", "json", file.name + ".json")
            );
            const data = JSON.parse(resultFile.toString());
            let videoResult = parseModelOutput(data);
            videoResult.time_to_process = end - start;
            resolve(videoResult);
        });
    });
    return promise;
};

function extractAudio(filePath, callback) {
    let file = path.parse(filePath);
    let audioPath = path.join(
        "audio-cache",
        "audio",
        "audio-" + file.name.split("-")[1]
    );
    return new Promise((resolve, reject) => {
        exec(
            `ffmpeg -i ${filePath} -ab 160k -ac 2 -ar 44100 -vn ${
                audioPath + ".wav"
            }`
        ).then(() => {
            resolve();
        });
    });
}

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
        confidence: 0.81,
        fps: fps,
    };
};

module.exports = { downloadVideo, classify };
