const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth");
const userControllers = require("../controllers/users");

router.get("/feed", auth, userControllers.feed);

router.get("/", auth, userControllers.getUsers);

router.get("/search", userControllers.searchUser);

router.post("/editUser", auth, userControllers.editUser);

router.post("/changePhoto", auth, userControllers.changePhoto);

router.get("/removePhoto", auth, userControllers.removePhoto);

router.get("/user/:userName", userControllers.getProfile);

router.get("/user/:userId/follow", auth, userControllers.follow);

router.get("/user/:userId/unFollow", auth, userControllers.unFollow);

module.exports = router;
