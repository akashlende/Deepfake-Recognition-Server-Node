const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const bodyParser = require("body-parser");

const job = require("./cron-jobs/job");
const pdfRouter = require("./routes/pdfRouter");

const path = require("path");
const fs = require("fs");
const https = require("https");

const ServeTwitter = require("./twitter/ServeTwitter");
const serveTwitter = new ServeTwitter();

const port = process.env.PORT || 3000;
const timeInMinutes = 1 / 2;
const removeHistory = require("./routes/removeHistory");
const passport = require("passport");
const fetchHistory = require("./routes/fetchHistory");
const classifyRouter = require("./routes/classifyRouter");
const userRouter = require("./routes/userRouter");
const videoRouter = require("./routes/videoRouter");
const imagePdfRouter = require("./routes/imagePdfRouter");

const deepfakeDB = require("./database/DeepfakeDB");
const imageRouter = require("./routes/imageRouter");

const app = express();
// app.get("/.well-known/pki-validation/DCCE6506425187ECC9C3D866C39F8F42.txt", (req, res, next) => {
//     res.sendFile(path.join(__dirname, "DCCE6506425187ECC9C3D866C39F8F42.txt"));
// });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(passport.initialize());

app.use(express.static("pdf-cache"));

app.use("/users", userRouter);
app.use("/get-video", videoRouter);
app.use("/remove", removeHistory);
app.use("/pdf", pdfRouter);
app.use("/pdf-image", imagePdfRouter);
app.use("/fetch-history", fetchHistory);
app.use("/classify", classifyRouter);
app.use("/get-image", imageRouter);

app.post("/api/search", serveTwitter.sendTweets);

const httpsServer = https.createServer({
    key: fs.readFileSync('./ssl/privkey.pem'),
    cert: fs.readFileSync('./ssl/fullchain.pem'),
}, app)

httpsServer.listen(443, () => {
    console.log('HTTPS Server running on port 443');
    // console.log(`Listening on port ${port}`);
    job.schedule();
    setInterval(() => {
        // serveTwitter.listenForTweets();
    }, timeInMinutes * 60 * 1000);
    // serveTwitter.listenForTweets();
});