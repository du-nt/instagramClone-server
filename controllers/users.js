const formidable = require("formidable");
const { upload } = require("../utils/helper");

const User = require("../models/User");
const Post = require("../models/Post");

const feed = async (req, res) => {
  const following = req.user.following;

  const users = await User.find()
    .where("_id")
    .in(following.concat([req.user.id]))
    .exec();

  const postIds = users.map((user) => user.posts).flat();

  const posts = await Post.find()
    .populate({
      path: "comments",
      select: "text",
      populate: { path: "user", select: "avatar displayName userName" },
    })
    .populate({ path: "author", select: "avatar displayName userName" })
    .populate({ path: "likes", select: " avatar userName displayName" })
    .where("_id")
    .in(postIds)
    .sort("-createdAt")
    .lean()
    .exec();

  posts.forEach((post) => {
    // is the logged in user liked the post
    post.isLiked = post.likes.some(
      (like) => like._id.toString() === req.user._id.toString()
    );

    // is the logged in saved this post

    post.isSaved = req.user.savedPosts.some(
      (_id) => _id.toString() === post._id.toString()
    );
    post.newComments = [];

    // is the post belongs to the logged in user

    // post.isMine = false;
    // if (post.author._id.toString() === req.user.id) {
    //   post.isMine = true;
    // }

    // is the comment belongs to the logged in user

    // post.comments.map((comment) => {
    //   comment.isCommentMine = false;
    //   if (comment.user._id.toString() === req.user.id) {
    //     comment.isCommentMine = true;
    //   }
    // });
  });

  res.json(posts);
};

const getProfile = async (req, res) => {
  const user = await User.findOne({ userName: req.params.userName })
    .select("-password -token")
    .populate({ path: "posts", select: "filePaths commentsCount likesCount" })
    .populate({
      path: "savedPosts",
      select: "filePaths commentsCount likesCount",
    })
    .populate({ path: "followers", select: "avatar userName displayName" })
    .populate({ path: "following", select: "avatar userName displayName" })
    .lean()
    .exec();

  if (!user) {
    return res.status(404).json({
      error: `The user ${req.params.userName} is not found`,
    });
  }

  res.json(user);
};

const follow = async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(404).json({
      error: `No user found for id ${req.params.userId}`,
    });
  }

  // make the sure the user is not the logged in user
  if (req.params.userId === req.user.id) {
    return res
      .status(404)
      .json({ error: "You can't unfollow/follow yourself" });
  }

  // only follow if the user is not following already
  if (user.followers.includes(req.user.id)) {
    return res.status(404).json({ error: "You are already following him" });
  }

  await User.findByIdAndUpdate(req.params.userId, {
    $push: { followers: req.user.id },
    $inc: { followersCount: 1 },
  });

  await User.findByIdAndUpdate(req.user.id, {
    $push: { following: req.params.userId },
    $inc: { followingCount: 1 },
  });

  res.json({ success: true });
};

const unFollow = async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(404).json({
      error: `No user found for id ${req.params.userId}`,
    });
  }

  // make the sure the user is not the logged in user
  if (req.params.userId === req.user.id) {
    return res
      .status(404)
      .json({ error: "You can't unfollow/follow yourself" });
  }

  // only unfollow if the user is following him
  if (!user.followers.includes(req.user.id)) {
    return res.status(404).json({ error: "You are not following him" });
  }

  await User.findByIdAndUpdate(req.params.userId, {
    $pull: { followers: req.user.id },
    $inc: { followersCount: -1 },
  });
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { following: req.params.userId },
    $inc: { followingCount: -1 },
  });

  res.json({ success: true });
};

const getUsers = async (req, res) => {
  let users = await User.find({
    _id: { $ne: req.user.id },
    followers: { $nin: [req.user.id] },
  })
    .select("avatar userName displayName")
    .lean()
    .exec();
  res.json(users);
};

const editUser = async (req, res) => {
  const { userName, email } = req.body;

  const existUser = await User.findOne({
    email,
    _id: { $ne: req.user.id },
  }).exec();
  const existUser1 = await User.findOne({
    userName,
    _id: { $ne: req.user.id },
  }).exec();
  if (existUser || existUser1) {
    let errors = {};
    if (existUser) {
      errors.email = "Email was used";
    }
    if (existUser1) {
      errors.userName = "Username was used";
    }
    return res.status(404).json(errors);
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: req.body },
    {
      new: true,
    }
  );
  res.json(user);
};

const changePhoto = async (req, res) => {
  const form = formidable();

  form.parse(req, (err, fields, file) => {
    if (err) {
      return res.status(404).json({ error: "Errored" });
    }
    if (file) {
      upload(file.file, "avatar")
        .then(async (url) => {
          const { avatar } = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { avatar: url } },
            {
              new: true,
            }
          );
          res.json({ avatar });
        })
        .catch((err) =>
          res.status(404).json({ success: false, error: err.message })
        );
    } else {
      res.status(404).json({ error: "No image provided" });
    }
  });
};

const removePhoto = async (req, res) => {
  const { avatar } = await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: {
        avatar:
          "https://res.cloudinary.com/douy56nkf/image/upload/v1594060920/defaults/txxeacnh3vanuhsemfc8.png",
      },
    },
    {
      new: true,
    }
  );
  res.json({ avatar });
};

const searchUser = async (req, res) => {
  if (!req.query.userName) {
    return res.status(404).json({ message: "The username cannot be empty" });
  }
  const regex = new RegExp(req.query.userName, "i");
  const users = await User.find({
    $or: [{ userName: regex }, { displayName: regex }],
  });

  res.json(users);
};

module.exports = {
  feed,
  getProfile,
  follow,
  unFollow,
  getUsers,
  editUser,
  changePhoto,
  removePhoto,
  searchUser,
};
