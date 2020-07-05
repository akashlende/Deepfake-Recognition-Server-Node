const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VideoSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
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
      type: Number,
      required: true,
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
  },
  { timestamps: true }
);

const Video = mongoose.model("video", VideoSchema);

module.exports = Video;
