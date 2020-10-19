const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const formidable = require("formidable");
const { upload } = require("../utils/helper");

const getPosts = async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
};

const addPost = async (req, res) => {
  const { user } = req;
  const form = formidable({ multiples: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(404).json({ error: "Errored" });
    }
    if (Object.keys(files).length) {
      if (files.files.length) {
        const uploadResponses = files.files.map((file) =>
          upload(file, "posts")
        );
        Promise.all(uploadResponses)
          .then(async (urls) => {
            const newPost = new Post({
              author: user._id,
              title: fields.title,
              filePaths: urls,
            });
            await newPost.save();
            await User.findByIdAndUpdate(user.id, {
              $push: { posts: newPost._id },
              $inc: { postCount: 1 },
            });
            await newPost
              .populate({
                path: "author",
                select: "avatar userName displayName",
              })
              .execPopulate();
            res.json(newPost);
          })
          .catch((err) =>
            res.status(404).json({ success: false, error: err.message })
          );
      } else {
        upload(files.files)
          .then(async (url) => {
            const path = [url];
            const newPost = new Post({
              author: user._id,
              title: fields.title,
              filePaths: path,
            });
            await newPost.save();
            await User.findByIdAndUpdate(user.id, {
              $push: { posts: newPost._id },
              $inc: { postCount: 1 },
            });
            await newPost
              .populate({
                path: "author",
                select: "avatar userName displayName",
              })
              .execPopulate();
            res.json(newPost);
          })
          .catch((err) =>
            res.status(404).json({ success: false, error: err.message })
          );
      }
    } else {
      res.status(404).json({ error: "No image provided" });
    }
  });
};

const toggleLike = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ error: "No post found" });
  }
  if (post.likes.includes(req.user.id)) {
    const index = post.likes.indexOf(req.user.id);
    post.likes.splice(index, 1);
    post.likesCount = post.likesCount - 1;
    await post.save();
  } else {
    post.likes.push(req.user.id);
    post.likesCount = post.likesCount + 1;
    await post.save();
  }
  res.json({ success: true });
};

const toggleSave = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ error: "No post found" });
  }
  if (req.user.savedPosts.includes(req.params.id)) {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { savedPosts: req.params.id },
    });
  } else {
    await User.findByIdAndUpdate(req.user.id, {
      $push: { savedPosts: req.params.id },
    });
  }
  res.json({ success: true });
};

const addComment = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ error: "No post found" });
  }

  // Validate text of post here...

  let comment = await Comment.create({
    user: req.user.id,
    post: req.params.id,
    text: req.body.text,
  });

  post.comments.push(comment._id);
  post.commentsCount = post.commentsCount + 1;
  await post.save();

  comment = await comment
    .populate({ path: "user", select: " userName " })
    .execPopulate();

  res.json(comment);
};

const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: "comments",
        select: "text",
        populate: {
          path: "user",
          select: "userName avatar",
        },
      })
      .populate({
        path: "author",
        select: "userName avatar",
      })
      .populate({ path: "likes", select: " avatar userName displayName" })
      .lean()
      .exec();

    res.json(post);
  } catch (error) {
    return res.status(404).json({
      error: `No post found for id ${req.params.id}`,
    });
  }
};

const getMorePosts = async (req, res) => {
  const posts = await Post.find({
    author: req.params.userId,
    _id: { $ne: req.params.postId },
  })
    .sort({ _id: -1 })
    .limit(6);
  res.json(posts);
};

module.exports = {
  getPosts,
  addPost,
  toggleLike,
  toggleSave,
  addComment,
  getPost,
  getMorePosts,
};
