const express = require("express");
const morgan = require("morgan"); // used for logging to console
const multer = require("multer"); // used to process formdata. Helps to download video file here
const path = require("path");
const ffmpeg = require("fluent-ffmpeg"); // for processing and getting information on video files
const uniqueFilename = require("unique-filename");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const fs = require("fs");
const mongoose = require("mongoose");

const classify = require("./twitter/classify").classify;
const pdfGenerator = require("./pdf-generation/generatePdf");
const ServeTwitter = require("./twitter/ServeTwitter");
const DeepfakeDB = require("./database/DeepfakeDB");

const deepfakeDB = new DeepfakeDB();
const serveTwitter = new ServeTwitter();

const port = process.env.PORT || 3000;
const timeInMinutes = 1;
const MaxFileSizeinMB = 100;
const MaxPlaybackTimeInMins = 1;
const MaxFPSAllowed = 30;
const { performance } = require("perf_hooks");
const { DH_CHECK_P_NOT_SAFE_PRIME, POINT_CONVERSION_UNCOMPRESSED } = require("constants");
const { resolve } = require("path");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "twitter\\video-cache\\");
  },

  filename: (req, file, cb) => {
    const uniqueFileName = uniqueFilename("", "video");
    cb(null, uniqueFileName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * MaxFileSizeinMB,
  },
}).single("video");

app.post("/api/search", serveTwitter.sendTweets);

app.get("/pdf", (req, res, next) => {
  const userId = req.query.userId;
  const videoId = req.query.videoId;
  deepfakeDB.findUser(userId, (user) => {
    if (user !== null) {
      deepfakeDB.findVideo(videoId).then((video) => {
        if (video !== null) {
          v = user.videos.filter((video) => video._id === videoId);
          if (v.length !== 0) {
            const data = {
              userId: user._id,
              videoId: video._id,
              status: video.status,
              ratio: video.realToFakeRatio,
              confidence: video.confidence,
              duration: video.duration,
              checksum: video.fileChecksum,
              bitrate: video.bitrate,
              size: video.fileSize,
            };
            pdfGenerator(data, (path) => {
              res.statusCode = 200;
              res.download(path.filename, "report.pdf");
            });
          } else {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json");
            res.send({ code: 403, message: "Video doesn't belong to user" });
          }
        } else {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.send({ code: 404, message: "Video not found" });
        }
      });
    } else {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.send({ code: 404, message: "User not found" });
    }
  });
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

app.post("/fetch-history", (req, res, next) => {
  deepfakeDB.findUser(req.body.userId, (user) => {
    // console.log(user);

    if (user) {
      deepfakeDB.findLimitFetchHistory(user._id, (rate) => {
        console.log(rate);
        if (rate.remaining > 0) {
          res.statusCode = 200;
          let data = {
            id: req.body.userId,
            twitterid: user.tweet_id,
            vid: user.videos,
            remaining: rate.remaining - 1,
          };

          var vdata = [];

          for (var i = 0; i < user.videos.length; i++) {
            let video = user.videos[i];
            vdata.push(deepfakeDB.findVideo(video._id));
          }

          Promise.all(vdata).then((vdata) => {
            deepfakeDB.decFetchRemaining(rate._id, () => {
              res.setHeader("Content-Type", "application/json");
              res.send({ code: 200, message: "User found", data, vdata });
            });
          });
        } else {
          res.statusCode = 429;
          res.setHeader("Content-Type", "application/json");
          res.send({ code: 429, message: "Rate limit exceeded" });
        }
      });
    } else {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.send({ code: 404, message: "user not found" });
    }
  });
});

app.post("/classify", (req, res, next) => {
  console.log("classify");
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.statusCode = 412;
        res.setHeader("Content-Type", "application/json");
        res.send({
          code: 412,
          message: `Size of file exceeded max permissible size of ${MaxFileSizeinMB}MB`,
          field: err.field,
        });
      }
    } else if (err) {
      // Errors unrelated to multer occurred when uploading are handled here.
    } else {
      let errFlag = false;
      let n = req.file.path.split("\\").length;
      let fileName = req.file.path.split("\\")[n - 1];
      getChecksum(req.file.path)
        .then((value) => {
          console.log("Checksum : " + value);
          const checksum = value;
          let duration = 0;
          let bitrate = 0;
          let fileSize = 0;

          ffmpeg.ffprobe(`twitter\\video-cache\\${fileName}`, (err, metadata) => {
            if (err)
              // Errors related to ffprobe will be handled here
              console.log(err);
            else {
              let streamFlag = false;
              for (let i = 0; i < metadata.streams.length; i++) {
                let stream = metadata.streams[i];
                if (stream.codec_type === "video") {
                  exist = true;
                  duration = stream.duration;
                  bitrate = stream.nb_frames;
                  fileSize = fs.statSync(`twitter\\video-cache\\${fileName}`);
                  console.log(fileSize.size + " bytes");
                  if (stream.duration > 60 * MaxPlaybackTimeInMins) {
                    res.statusCode = 413;
                    res.setHeader("Content-Type", "application/json");
                    res.send({
                      code: 413,
                      message: `Video length should not exceed ${MaxPlaybackTimeInMins} minutes`,
                    });
                    errFlag = true;
                  } else if (stream.nb_frames > 60 * MaxPlaybackTimeInMins * MaxFPSAllowed) {
                    res.statusCode = 413;
                    res.setHesCode = 413;
                    res.setHeader("Content-Type", "application/json");
                    res.send({
                      code: 413,
                      message:
                        `Total frames in video should not exceed ` +
                        `${60 * MaxPlaybackTimeInMins * MaxFPSAllowed} minutes`,
                    });
                    errFlag = true;
                  }
                  streamFlag = true;
                  break;
                }
              }
              if (!streamFlag) {
                res.statusCode = 422;
                res.setHeader("Content-Type", "application/json");
                res.send({ code: 422, message: `No video codec found` });
                errFlag = true;
              }
              if (!errFlag) {
                // All Error Handled up till here
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
                        message: "Video is being processed ",
                      });
                      classify(req.file.path).then((result) => {
                        let data = {
                          filePath: req.file.path,
                          videoExists: exist,
                          timeToProcess: result.time_to_process,
                          confidence: result.confidence,
                          realToFakeRatio: result.realPercent,
                          status: result.majority,
                          fileChecksum: checksum,
                          duration: duration,
                          bitrate: bitrate,
                          fileSize: fileSize.size,
                        };
                        deepfakeDB.insert("videos", data, (video) => {
                          let dd = {
                            _id: video._id,
                            feedback: "",
                            tweetId: "",
                          };

                          deepfakeDB.insertUserVideo(req.body.userId, dd, (user) => {
                            console.log("vid inserted in db ");
                            console.log(user);
                          });
                        });
                      });
                    });
                  }
                });
              }
            }
          });
        })
        .catch(console.error);
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
  setInterval(() => {
    // serveTwitter.listenForTweets();
  }, timeInMinutes * 60 * 1000);
  // serveTwitter.listenForTweets();
});
