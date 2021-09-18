require('dotenv').config();
const { connect } = require('amqplib');
const PostModel = require('./model/Post');
const mongoose = require('mongoose');

const COMMENT_QUEUE = 'COMMENT_QUEUE'; 
const STATUS_CHANGE_QUEUE = 'STATUS_CHANGE_QUEUE'; 

async function execute() {
  try {
    console.log('Starting...');

    await db();
    const channel = await openConnectionAndChannel();
    await consume(channel, COMMENT_QUEUE, sendEmailAndSaveMessage);
    await consume(channel, STATUS_CHANGE_QUEUE, sendEmailStatus);

  } catch(e) {
    // TODO how to recover from error
    console.log(e);
  }
}

async function db() {
  await mongoose.connect(process.env.MONGO_URL);
}

async function openConnectionAndChannel() {
  try {
    const conn = await connect(process.env.RABBIT_URL);
    const channel = await conn.createChannel();
    return channel;
  } catch(e) {
    throw e;
  }
}

async function consume(channel, queueName, callback) {
  await channel.consume(queueName, callback, { noAck: true });
}

async function sendEmailAndSaveMessage(msgBytes) {
  if (msgBytes == null) return;
  const msgString = msgBytes.content.toString();
  const msgJson = JSON.parse(msgString);

  console.log({ msgJson });

  const { post_author_email, comment_author_email } = msgJson;

  await sendEmail({ post_author_email, comment_author_email} );

  await saveMessage(msgJson);
}

async function sendEmailStatus(msgBytes) {
  // TODO
  if (msgBytes == null) return;
  const msgString = msgBytes.content.toString();
  const msgJson = JSON.parse(msgString);

  console.log({ msgJson });

  const { post_id } = msgJson;
  const post = await PostModel.findOneAndDelete({_id: post_id});
  if (!post) return;

  const comments = post.comments;
  comments.forEach(comment => {
    console.log(`send email to ${comment.commentAuthorEmail}`);
  });

}

async function sendEmail({ post_author_email, comment_author_email }) {
  console.log(`Send email to ${post_author_email}`);
}

async function saveMessage(msgJson) {
  let post = await PostModel.findOne({_id: msgJson.post_id});

  if (!post) {
    post = new PostModel({
      _id: msgJson.post_id,
      postAuthorName: msgJson.post_author_name,
      postAuthorEmail: msgJson.post_author_email,
    });

    await post.save();
  }

  const comment = {
    commentAuthorName: msgJson.comment_author_name,
    commentAuthorEmail: msgJson.comment_author_email
  };

  await PostModel.updateOne(
    {
      _id: post._id
    },
    {
      $addToSet: { comments: comment }
    }
  );
}


execute();
