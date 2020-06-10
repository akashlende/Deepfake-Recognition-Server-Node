const request = require("request");
const process = require("process");
const execFile = require("child_process").execFile;

const dm = require("./requests/dm");

const AUTH_PATH = "./requests/auth.json";

class ServeTwitter {
    /**Returns true for successfull DM, else false
     * Parameters:  Recipient Twitter ID,
     *              API Calls remaining for a recipient,
     *              Total API Calls allocated to a recipient
     */
    directMessageUser(recipient_id, remaining, limit) {
        // console.log("Direct Messaging User ...");
        var options = {
            method: "POST",
            url: "https://api.twitter.com/1.1/direct_messages/events/new.json",
            headers: dm.getHeader(),
            body: JSON.stringify(dm.getBody(recipient_id, remaining, limit)),
        };
        request(options, function (error, response) {
            if (error) return false;
            else if (response.statusCode === 200) return true;
            else return false;
        });
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
                else if (stdout === "200") return true;
                return false;
            }
        );
    }
}
new ServeTwitter().commentOnTweet(
    "1269199358441877504",
    0.94,
    ["00:25", "00:54", "01:23", "02:04", "02:34"],
    false
);
