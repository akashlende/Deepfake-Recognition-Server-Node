const express = require("express");
const bodyParser = require("body-parser");
const RateSchema = require("../database/models/limit").RateSchema;
const User = require("../database/models/user");
const passport = require("passport");
const authenticate = require("../auth/authenticate");
const deepfakeDB = require("../database/DeepfakeDB");
const Limit = require("../database/models/limit");

const userRouter = express.Router();
userRouter.use(bodyParser.json());

userRouter.post("/signup", (req, res) => {
	User.register(
		new User({ username: req.body.username, email: req.body.email }),
		req.body.password,
		(err, user) => {
			if (err) {
				res.statusCode = 500;
				res.setHeader("Content-Type", "application/json");
				res.json({ err: err, success: false });
			} else {
				if (req.body.name) user.name = req.body.name;
				if (req.body.email) user.email = req.body.email;
				if (req.body.twitterUserId) user.twitterUserId = req.body.twitterUserId;
				user.save((err, user) => {
					if (err) {
						res.statusCode = 500;
						res.setHeader("Content-Type", "application/json");
						res.json({ err: err, success: false });
						return;
					}
					passport.authenticate("local")(req, res, () => {
						Limit.create({ fetchHistory: [], classify: [] }).then((value) => {
							deepfakeDB.insert(
								"limits-classify",
								{
									_id: user._id,
									limit: 10,
									remaining: 10,
								},
								() => {
									deepfakeDB.insert(
										"limits-fetch-history",
										{
											_id: user._id,
											limit: 10,
											remaining: 10,
										},
										() => {
											res.statusCode = 200;
											res.setHeader("Content-Type", "application/json");
											res.json({
												status: "Registration Successful!",
												success: true,
											});
										}
									);
								}
							);
						});
					});
				});
			}
		}
	);
});

userRouter.post("/login", passport.authenticate("local"), (req, res) => {
	const token = authenticate.getToken({ _id: req.user._id });
	res.statusCode = 200;
	res.setHeader("Content-Type", "application/json");
	res.json({
		status: "Login Successful!",
		success: true,
		token: token,
		id: req.user._id,
	});
});

module.exports = userRouter;