const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth");
const postsController = require("../controllers/posts");

router.get("/", auth, postsController.getPosts);

router.get("/:userId/morePosts/:postId", postsController.getMorePosts);

router.get("/:id", postsController.getPost);

router.post("/addPost", auth, postsController.addPost);

router.get("/:id/toggleLike", auth, postsController.toggleLike);

router.get("/:id/toggleSave", auth, postsController.toggleSave);

router.post("/:id/addComment", auth, postsController.addComment);

module.exports = router;
