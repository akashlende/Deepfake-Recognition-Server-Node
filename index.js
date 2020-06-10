const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const getFrames = require("./getFrames").getFrames;

app.use(bodyParser.raw({ type: "application/json" }));

app.post("/api/search/", getFrames);

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
