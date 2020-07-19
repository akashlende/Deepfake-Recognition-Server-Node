const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ImageSchema = new Schema(
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
        confidence: {
            type: String,
            required: true,
        },
        timeToProcess: {
            type: Number,
            required: true,
        },
        checksum: {
            type: String,
            required: true,
        },
        size: {
            type: Number,
            required: true,
        },
        isFacePresent: {
            type: Boolean,
            required: true,
        },
    },
    { timestamps: true },
);

const Image = mongoose.model("image", ImageSchema);

module.exports = Image;
