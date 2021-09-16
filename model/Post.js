const mongoose = require('mongoose');

const Post = new mongoose.Schema({
  _id: String, // postId
  postAuthorName: String,
  comments: [{
    _id: 0,
    commentAuthorName: String,
    commentAuthorEmail: String
  }],
});

const model = mongoose.model('Post', Post);

module.exports = model;
