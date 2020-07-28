const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VideoSchema = new Schema(
	{
		fileName: {
			type: String,
			required: false,
		},
		filePath: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			required: true,
		},
		realToFakeRatio: {
			type: Number,
			required: true,
		},
		fileChecksum: {
			type: String,
			default: "",
		},
		timestamps: {
			type: Array,
			required: true,
		},
		confidence: {
			type: String,
			required: true,
		},
		timeToProcess: {
			type: Number,
			required: true,
		},
		videoExists: {
			type: String,
			required: true,
		},
		duration: {
			type: Number,
			default: null,
		},
		bitrate: {
			type: Number,
			default: null,
		},
		fileSize: {
			type: Number,
			default: null,
		},
	},
	{ timestamps: true }
);

const Video = mongoose.model("video", VideoSchema);

module.exports = Video;
