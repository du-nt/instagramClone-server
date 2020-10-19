const mongoose = require("mongoose");

const PostSchema = mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      maxlength: 50,
    },
    tags: {
      type: [String],
    },
    filePaths: {
      type: [String],
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: {
      type: Number,
      default: 0,
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
