import mongoose, { Schema } from "mongoose";

const videoSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  thumbUrl: { type: String, required: true },
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
  description: {
    type: String,
    required: true,
    default: "설명이 없습니다.",
    maxLength: 300,
    trim: true,
  },
  uploader: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  category: { type: String, required: true, default: "기타" },
  tags: [{ type: String, trim: true, default: "none" }],
  meta: {
    views: { type: Number, default: 0, required: true },
    likes: { type: Number, default: 0, required: true },
    dislikes: { type: Number, default: 0, required: true },
  },
  owner: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: "User" },
});

videoSchema.static("formatTags", function (tags) {
  return (tags = tags
    .replace(/ /g, "")
    .split(",")
    .map((word) => (word.startsWith("#") ? word : `#${word}`)));
});

const videoModel = mongoose.model("Video", videoSchema);

export default videoModel;
