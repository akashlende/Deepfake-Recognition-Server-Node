const fs = require("fs");
const deepfakeDB = require("../database/DeepfakeDB");
const cron = require("node-cron");

const TimeBeforeDeleteInHours = 24;

class Job {
    constructor() {}

    deleteFiles(dir) {
        dir += "/";
        fs.readdir(dir, (err, files) => {
            {
                files = files
                    .map((fileName) => {
                        return {
                            name: fileName,
                            time: fs.statSync(dir + fileName).mtime.getTime(),
                        };
                    })
                    .filter(
                        (file) => file.time < Date.now() - TimeBeforeDeleteInHours * 60 * 60 * 1000,
                    );

                files.forEach((file) => {
                    fs.unlink(dir + file.name, () => {
                        console.log(dir + file.name + " deleted");
                    });
                });
            }
        });
    }

    unprocessTweets() {
        deepfakeDB.deleteTweets(() => {
            console.log("Un-processed tweets deleted");
        });
    }

    renewLimits() {
        deepfakeDB.updateLimits((limits) => {
            console.log("API limits renewed!");
        });
    }
    schedule() {
        //              ┌────────────── second (optional)
        //              │ ┌──────────── minute
        //              │ │ ┌────────── hour
        //              │ │ │ ┌──────── day of month
        //              │ │ │ │ ┌────── month
        //              │ │ │ │ │ ┌──── day of week
        //              │ │ │ │ │ │
        //              │ │ │ │ │ │
        // cron-syntax: * * * * * *
        cron.schedule("59 59 23 * * *", () => {
            this.deleteFiles("../video-cache");
            this.deleteFiles("../video-results/json");
            this.deleteFiles("../video-results/video");
            this.renewLimits();
            this.unprocessTweets();
        });
        console.log("Cron job scheduled");
    }
}

module.exports = new Job();
