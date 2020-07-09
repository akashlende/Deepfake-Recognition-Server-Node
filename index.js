const express = require("express");
const morgan = require("morgan"); // used for logging to console
const cors = require("cors");

const bodyParser = require("body-parser");

const pdfRouter = require("./routes/pdfRouter");

const ServeTwitter = require("./twitter/ServeTwitter");
const serveTwitter = new ServeTwitter();

const port = process.env.PORT || 3000;
const timeInMinutes = 1;

const passport = require("passport");
const fetchHistory = require("./routes/fetchHistory");
const classifyRouter = require("./routes/classifyRouter");
const userRouter = require("./routes/userRouter");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(passport.initialize());

app.use(express.static("pdf-cache"));

app.use("/users", userRouter);

app.use("/pdf", pdfRouter);
app.use("/fetch-history", fetchHistory);
app.use("/classify", classifyRouter);

app.post("/api/search", serveTwitter.sendTweets);

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
	setInterval(() => {
		// serveTwitter.listenForTweets();
	}, timeInMinutes * 60 * 1000);
	// serveTwitter.listenForTweets();
});
