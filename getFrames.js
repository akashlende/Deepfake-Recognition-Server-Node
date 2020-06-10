const axios = require("axios").default;
const { execSync } = require("child_process");
const fs = require("fs");

const pythonExec = "python";
const latestIndex = 0;

function getFrames(req, res) {
	const request = axios({
		method: "POST",
		url: "https://api.twitter.com/1.1/tweets/search/30day/dev.json",
		data: req.body.toString(),
		headers: {
			Authorization: `Bearer ${process.env.TWITTER_AUTH}`,
			"Content-Type": "application/json",
			Cookie:
				'personalization_id="v1_CjtCqPT5t1ckgO8TylZOtg=="; guest_id=v1%3A159158560925302598',
		},
	});
	request.then((value) => {
		const r = value.data;
		const videos = r.results;
		let videoList = [];
		let users = [];
		videos.forEach((video) => {
			users.push(video.user);
			const variants = video.extended_entities.media[0].video_info.variants;
			brList = [];
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

		const latestVideo = videoList[latestIndex];
		console.log(`User: ${users[latestIndex].screen_name}\nURL: ${latestVideo}`);
		execSync(
			`${pythonExec} -W ignore predict.py -m model\\full_c40.p -i ${latestVideo} --cuda`
		);
		const resultFile = fs.readFileSync("frames.json");
		const data = JSON.parse(resultFile.toString());
		res.send(makeResponse(data, users));
	});
	request.catch((reason) => {
		res.send(reason);
	});
}

function makeResponse(data, users) {
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

	return {
		frameCount: frames.length,
		realPercent: realPercent,
		fakePercent: fakePercent,
		majority: majority,
		fps: fps,
		name: users[latestIndex].name,
		username: users[latestIndex].screen_name,
	};
}

exports.getFrames = getFrames;
