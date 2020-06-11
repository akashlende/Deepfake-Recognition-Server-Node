const process = require("process");
const execFile = require("child_process").execFile;
const axios = require("axios");

const AUTH_PATH = "./requests/auth.json";

class ServeTwitter {
    constructor() {
        console.log("Instance of serveTwitter created.");
    }

    fetchTweets(callback) {
        const latestIndex = 0;
        let videoList = [];

        axios({
            method: "GET",
            url: "https://api.twitter.com/1.1/search/tweets.json",
            params: { "q": "@theSentinels_20", "count": 100 },
            headers: {
                Authorization: `Bearer ${require(AUTH_PATH).oauth2token}`,
            }
        }).then((value) => {
            const tweets = value.data.statuses;
            let users = [];
            tweets.forEach((tweet) => {
                users.push(tweet.user);
                const variants = tweet.extended_entities.media[0].video_info.variants;
                let brList = [];
                variants.forEach((variant) => {
                    if (variant.bitrate == undefined) brList.push(-1);
                    else brList.push(variant.bitrate);
                });
                let j = brList.indexOf(-1);
                if (j != -1) brList[j] = Math.max(...brList) - 1;

                // Change max to min if you want lower quality video
                let i = brList.indexOf(Math.max(...brList));
                videoList.push(variants[i].url);
            });

            if (callback) callback(videoList[latestIndex], users[latestIndex].id_str);

        }).catch((reason) => {
            console.log("ERR: " + reason.response.status, reason.response.statusText)
            // if (callback) callback("http://localhost\\SIH2020\\server\\twitter-videos\\sample.mp4");
        });
        // callback("http://localhost\\SIH2020\\server\\twitter-videos\\sample.mp4", "1208458421499920384");
    }

    /**Returns true for successfull DM, else false
     * Parameters:  Recipient Twitter ID,
     *              API Calls remaining for a recipient,
     *              Total API Calls allocated to a recipient
     */
    directMessageUser(recipient_id, remaining, limit) {
        // console.log("Direct Messaging User ...");
        execFile(
            `./requests/dm/dist/${
            process.platform == "win32"
                ? "dm.exe"
                : process.platform == "darwin"
                    ? "dm_mac"
                    : "dm"
            }`,
            [
                "--recepient",
                recipient_id,
                "--remaining",
                remaining,
                "--limit",
                limit,
                "--auth",
                AUTH_PATH,
            ],
            (err, stdout, stderr) => {
                console.log(stderr);
                if (err) return false;
                else if (stdout === "200") return true;
                return false;
            }
        );
    }

    /**Returns true for successfull comment, else false
     * Parameters:  Tweet ID to comment to,
     *              Confidence of prediction,
     *              Timestamps for frames detected fake,
     *              Boolean value true for Video real, else false
     */
    commentOnTweet(tweetId, confidence, timestamps, isReal) {
        // console.log("Commenting on user tweet ...");
        let stamps = "[";
        for (let i = 0; i < timestamps.length; i++) {
            stamps += timestamps[i];
            if (i < timestamps.length - 1) stamps += ",";
        }
        stamps += "]";
        execFile(
            `./requests/comment/dist/${
            process.platform == "win32"
                ? "comment.exe"
                : process.platform == "darwin"
                    ? "comment_mac"
                    : "comment"
            }`,
            [
                "--tweetId",
                tweetId,
                "--status",
                isReal,
                "--confidence",
                confidence,
                "--timestamp",
                stamps,
                "--auth",
                AUTH_PATH,
            ],
            (err, stdout, stderr) => {
                if (err) return false;
                else if (stdout === "200") { console.log("true"); return true }
                else return false;
            }
        );
    }
}
// new ServeTwitter().directMessageUser(
//     "1208458421499920384",
//     9,
//     10
// );

// new ServeTwitter().commentOnTweet(
//     "1269199358441877504",
//     0.45,
//     ["00:25", "00:54", "01:23", "02:02", "02:34"],
//     false
// );

new ServeTwitter().fetchTweets();

module.exports = new ServeTwitter();