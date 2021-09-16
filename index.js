require('dotenv').config();
const { connect } = require('amqplib');
const PostModel = require('./model/Post');
const mongoose = require('mongoose');

const COMMENT_QUEUE = 'COMMENT_QUEUE'; 
const STATUS_CHANGE_QUEUE = 'STATUS_CHANGE_QUEUE'; 

async function db() {
  await mongoose.connect(process.env.MONGO_URL);
}

async function openConnection() {
  try {
    await db();
    const conn = await connect(process.env.RABBIT_URL);
    const channel = await conn.createChannel();
    await channel.consume(COMMENT_QUEUE, async function(msgBytes) {
      if (msgBytes == null) return;
      const msgString = msgBytes.content.toString();
      const msgJson = JSON.parse(msgString);
      const fpost = await PostModel.findOne({_id: msgJson.post_id});

      if (fpost) return;

      const post = new PostModel({
        _id: msgJson.post_id,
        postAuthorName: msgJson.post_author_name,
        postAuthorEmail: msgJson.post_author_email,
      });
      await post.save();
      const comment = {
        commentAuthorName: msgJson.comment_author_name,
        commentAuthorEmail: msgJson.comment_author_email
      };

      await PostModel.updateOne(
        {
        _id: msgJson.post_id
        },
        {
          $addToSet: { comments: comment }
        }
      ); 

    }, { noAck: true });
  } catch(e) {
    console.log(e);
  }
}

openConnection();
