const mongoose = require('mongoose');

const Post = new mongoose.Schema({
  _id: String, // postId
  postAuthorName: String,
  postAuthorEmail: String,
  comments: [{
    _id: 0,
    commentAuthorName: String,
    commentAuthorEmail: String
  }],
}, {collections: 'posts'});

const model = mongoose.model('post', Post);

module.exports = model;
