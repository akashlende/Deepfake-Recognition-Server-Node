const process = require("process");
const execFile = require("child_process").execFile;
const axios = require("axios");
const { response } = require("express");

const AUTH_PATH = "../requests/auth.json";

class ServeTwitter {
	constructor() {
		console.log("Instance of ServeTwitter created.");
		this.sendTweets = this.sendTweets.bind(this);
	}

	/**
	 *
	 * @param {callback} response - Gives object with userId, tweetId, timestamp, url.
	 */
	fetchTweets(params, callback) {
		axios({
			method: "GET",
			url: "https://api.twitter.com/1.1/search/tweets.json",
			params: params,
			headers: {
				authorization: `Bearer ${require(AUTH_PATH).oauth2token}`,
			},
		})
			.then((value) => {
				const tweets = value.data.statuses;
				let response = [];
				tweets.forEach((tweet) => {
					if (tweet.extended_entities !== undefined) {
						let temp = {};
						temp.created_at = tweet.created_at;
						temp.tweet_id = tweet.id_str;
						// TODO: Check if tweet is already processed.
						temp.userId = tweet.user.id_str;
						// TODO: Using userID check in DB for remaining limit.
						temp.screen_name = tweet.user.screen_name;

						const variants =
							tweet.extended_entities.media[0].video_info.variants;
						let brList = [];
						variants.forEach((variant) => {
							if (variant.bitrate == undefined) brList.push(-1);
							else brList.push(variant.bitrate);
						});
						let j = brList.indexOf(-1);
						if (j != -1) brList[j] = Math.max(...brList) - 1;

						// * Change max to min if you want lower quality video
						let i = brList.indexOf(Math.max(...brList));
						temp.url = variants[i].url;
						response.push(temp);
					}
				});

				if (callback) callback(response);
			})
			.catch((reason) => {
				console.log("ERR: " + reason);
			});
		// callback({ timestamp: "", tweetId: "1269622971288576001", userId: "1208458421499920384", url: "http://localhost\\SIH2020\\server\\result.mp4" });
	}

	sendTweets(req, res) {
		this.fetchTweets(req.body, (tweet) => {
			res.send(tweet);
		});
	}

	/**
	 * @param {string} recipient_id - Twitter ID
	 * @param {Number} remaining - API Calls remaining for a recipient,
	 * @param {Number} limit - Total API Calls allocated to a recipient
	 * @returns {boolean} - True for successfull DM, else False
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
				if (err) return false;
				else if (stdout === "200") return true;
				return false;
			}
		);
	}

	/**
	 *
	 * @param {string} tweetId - Tweet ID to comment to
	 * @param {number} confidence - Confidence of prediction
	 * @param {string array} timestamps - Timestamps for frames detected fake
	 * @param {boolean} isReal - Boolean value true for Video real, else false
	 * @returns {boolean} True for successfull comment, else False
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

// new ServeTwitter().fetchTweets();
module.exports = ServeTwitter;
