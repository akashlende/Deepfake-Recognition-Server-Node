const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ComplainSchema = new Schema({
    caseId: {
        type: String,
        required: false,
    },
    officername: {
        type: String,
        required: false,
    },
    officerId: {
        type: String,
        required: false,
    },
    station: {
        type: String,
        required: false,
    },
    district: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: false,
    },
    state: {
        type: String,
        required: false,
    },
    firId: {
        type: String,
        required: false,
    },
    firDate: {
        type: String,
        required: false,
    },
    firDesc: {
        type: String,
        required: false,
    },
    personMentioned: {
        type: String,
        required: false,
    },
    cmpltName: {
        type: String,
        required: false,
    },
    cmpltNumber: {
        type: Number,
        required: false,
    },
    aadhar: {
        type: String,
        required: false,
    },
    cmpltEmail: {
        type: String,
        required: false,
    },
    cmpltAddr: {
        type: String,
        required: false,
    },
    gender: {
        type: String,
        required: false,
    },
});

const Complain = mongoose.model("complain", ComplainSchema);

module.exports = Complain;
