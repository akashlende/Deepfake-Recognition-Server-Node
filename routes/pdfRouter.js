const express = require("express");
const bodyParser = require("body-parser");
const deepfakeDB = require("../database/DeepfakeDB");
const authenticate = require("../auth/authenticate");
const path = require("path");

const pdfGenerator = require("../pdf-generation/generatePdf");

const pdfRouter = express.Router();
pdfRouter.use(bodyParser.json());

pdfRouter.get("/", authenticate.verifyUser, (req, res, next) => {
    const userId = req.query.userId;
    const videoId = req.query.videoId;
    const complainId = req.query.complainId;
    deepfakeDB.findgetPdfVideo(userId, (rate) => {
        if (rate.remaining <= 0) {
            res.statusCode = 429;
            res.setHeader("Content-Type", "application/json");
            res.send({ code: 429, message: "Rate limit exceeded" });
        } else {
            deepfakeDB.decgetPdfVideo(userId, () => {
                deepfakeDB.findUser(userId, (user) => {
                    if (user !== null) {
                        deepfakeDB.findVideo(videoId).then((video) => {
                            if (video !== null) {
                                const v = user.videos.filter(
                                    (video) => video._id === videoId
                                );
                                if (v.length !== 0) {
                                    deepfakeDB.findComplain(complainId).then((complain) => {
                                        console.log("user data", user.complains);
                                        const data = {
                                            caseId: complain.caseId,
                                            userId: user._id,
                                            videoId: video._id,
                                            status: video.status,
                                            ratio: video.realToFakeRatio,
                                            confidence: video.confidence,
                                            duration: video.duration,
                                            checksum: video.fileChecksum,
                                            bitrate: video.bitrate,
                                            size: video.fileSize,
                                            officerName: complain.officerName,
                                            officerId: complain.officerId,
                                            station: complain.station,
                                            district: complain.district,
                                            city: complain.city,
                                            state: complain.state,
                                            firId: complain.firId,
                                            firDate: complain.firDate,
                                            firDesc: complain.firDesc,
                                            personMentioned: complain.personMentioned,
                                            cmpltName: complain.cmpltName,
                                            cmpltEmail: complain.cmpltEmail,
                                            cmpltNumber: complain.cmpltNumber,
                                            aadhar: complain.aadhar,
                                            cmpltAddr: complain.cmpltAddr,
                                        };
                                        pdfGenerator(data, (filePath) => {
                                            res.statusCode = 200;
                                            let file = path.parse(
                                                filePath.filename
                                            );
                                            let fileName = file.base;
                                            res.json({ report: fileName });
                                        });
                                    })

                                } else {
                                    res.statusCode = 403;
                                    res.setHeader(
                                        "Content-Type",
                                        "application/json"
                                    );
                                    res.send({
                                        code: 403,
                                        message: "Video doesn't belong to user",
                                    });
                                }
                            } else {
                                res.statusCode = 404;
                                res.setHeader(
                                    "Content-Type",
                                    "application/json"
                                );
                                res.send({
                                    code: 404,
                                    message: "Video not found",
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

module.exports = pdfRouter;
