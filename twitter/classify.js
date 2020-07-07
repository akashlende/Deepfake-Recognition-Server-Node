const fs = require("fs");
const URL = require("url").URL;
const https = require("https");
const http = require("http");
const uniqueFilename = require("unique-filename");
const axios = require("axios");
const { execSync } = require("child_process");
const { performance } = require("perf_hooks");

const pythonExec = "python";

const classify = (filePath) => {
  let promise = new Promise((resolve, reject) => {
    let start = performance.now();
    execSync(
      `${pythonExec} -W ignore predict.py -m .\\model\\full_raw.p -i ${filePath} --cuda --dev`,
    );
    let end = performance.now();
    let temp = filePath.split("\\");
    temp = temp[temp.length - 1];
    const resultFile = fs.readFileSync(".\\twitter\\twitter-json\\" + temp.split(".")[0] + ".json");
    const data = JSON.parse(resultFile.toString());
    let videoResult = parseModelOutput(data);
    videoResult.time_to_process = end - start;
    resolve(videoResult);
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

    const uniqueFileName = uniqueFilename(".\\twitter\\twitter-videos", "video");

    let file = { path: uniqueFileName + ".mp4" };

    console.log("File created:", file.path);

    getVideo(url.toString(), uniqueFileName + ".mp4").then(() => {
      let start = performance.now();
      classify(file.path).then((videoResult) => {
        let end = performance.now();
        const time_taken = end - start;
        resolve({
          filePath: file.path,
          time_to_process: time_taken,
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
    confidence: 0.81,
    fps: fps,
  };
};

module.exports = { downloadVideo, classify };
