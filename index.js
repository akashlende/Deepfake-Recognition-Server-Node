const express = require("express");
const axios = require("axios");
const app = express();

const bodyParser = require("body-parser");
const ServeTwitter = require("./twitter/ServeTwitter");
const DeepfakeDB = require("./database/DeepfakeDB");

app.use(bodyParser.raw({ type: "application/json" }));

const serveTwitter = new ServeTwitter();
const deepfakeDB = new DeepfakeDB();

app.post("/api/search/", serveTwitter.sendTweets);

const port = process.env.PORT || 3000;

const timeInMinutes = 1;

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
	deepfakeDB.connect();
	setInterval(() => {
		// Place below code in here for regular checking
	}, timeInMinutes * 60 * 1000);
	axios({
		method: "POST",
		url: "http://localhost:3000/api/search",
		headers: {
			"Content-Type": "application/json",
		},
		data: JSON.stringify({
			q: "@theSentinels_20",
		}),
	}).then((res) => {
		tweets = res.data;
		tweets.forEach((tweet) => {
			deepfakeDB.insert(
				"users",
				{
					_id: tweet.userId,
					screen_name: tweet.screen_name,
					tweet_id: tweet.tweet_id,
				},
				(value) => {
					console.log(value);
				}
			);
			deepfakeDB.insert(
				"tweets",
				{
					_id: tweet.tweet_id,
					created_at: tweet.created_at,
					status: Math.round(Math.random()) ? "REAL" : "FAKE", // Temp
					timestamps: [],
					confidence: 0.91,
					time_to_process: Math.round(Math.random() * Math.floor(2000)),
				},
				(value) => {
					console.log(value);
				}
			);
		});
	});
});
