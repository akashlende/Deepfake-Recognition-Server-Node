const pdf = require("pdf-creator-node");
const fs = require("fs");
const html = fs.readFileSync("./pdf-generation/template.html", "utf8");

const options = {
	format: "A4",
	orientation: "portrait",
	border: "10mm",
	footer: {
		height: "10mm",
		contents: {
			default: `
          <div
              style="
              border-top: 1px solid black;
              left: 30px;
              right: 30px;
              "
          />
          <div style="float: left; font-size: 8px;">
              SMART INDIA HACKATHON 2020
          </div>
          <div style="float: right; font-size: 8px;">
              THE SENTINELS | MES COLLEGE OF ENGINEERING, PUNE
          </div>
          `,
		},
	},
};

module.exports = (d, callback) => {
	console.log(d);
	var document = {
		html: html,
		data: {
			user: " The Sentinels",
			reportTitle:
				d.status == "REAL" ? "Video Verified Real" : "Video Found Fake",
			caseId: d.caseId,
			userId: d.userId,
			videoId: d.videoId,
			checksum: d.checksum,
			duration: d.duration + " seconds",
			size: d.size + " bytes",
			bitrate: d.bitrate / d.duration + "frames/second",
			ratio: d.ratio,
			confidence: d.confidence,
			officerName: d.officerName,
			officerId: d.officerId,
			station: d.station,
			district: d.district,
			city: d.city,
			state: d.state,
			firId: d.firId,
			firDate: d.firDate,
			firDesc: d.firDesc,
			personMentioned: d.personMentioned,
			cmpltName: d.cmpltName,
			cmpltEmail: d.cmpltEmail,
			cmpltNumber: d.cmpltNumber,
			aadhar: d.aadhar,
			cmpltAddr: d.cmpltAddr,
		},
		path: "./pdf-cache/" + d.videoId + ".pdf",
	};
	pdf
		.create(document, options)
		.then((res) => {
			callback(res);
		})
		.catch((error) => {
			console.error(error);
		});
};
