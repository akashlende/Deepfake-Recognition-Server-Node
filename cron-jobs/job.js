const fs = require("fs");
const deepfakeDB = require("../database/DeepfakeDB");
const cron = require("node-cron");

const TimeBeforeDeleteInHours = 24;

// TODO 2. update limits after 1 day

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
                        console.log(file.name + " deleted");
                    });
                });
            }
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
        });
        console.log("Cron job scheduled");
    }
}

module.exports = new Job();
