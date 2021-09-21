require('dotenv').config();
const { connect } = require('amqplib');
const PostModel = require('./model/Post');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

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
  await channel.assertQueue(queueName);
  await channel.consume(queueName, (msgBytes) => callback(msgBytes, channel));
}

async function sendEmailAndSaveMessage(msgBytes, ch) {
  if (msgBytes == null) return;
  const msgString = msgBytes.content.toString();
  const msgJson = JSON.parse(msgString);

  console.log({ msgJson });

  const { post_author_email, comment_author_email } = msgJson;

  await sendEmail({
    to: post_author_email,
    userEmail: comment_author_email,
    subject: 'Someone commented on your post. Go check it out.',
    text: `User ${comment_author_email} may have some news for you.`,
  });

  await saveMessage(msgJson);

  await ch.ack(msgBytes);
}

async function sendEmailStatus(msgBytes, ch) {
  if (msgBytes == null) return;

  const msgString = msgBytes.content.toString();
  const msgJson = JSON.parse(msgString);

  console.log({ msgJson });

  const { post_id } = msgJson;
  const post = await PostModel.findOne({_id: post_id});
  if (!post) return

  const comments = post.comments;
  comments.forEach(comment => {
    sendEmail({
      to: comment.commentAuthorEmail,
      userEmail: post.postAuthorEmail,
      subject: 'A post you commented on has changed status',
      text: `Looks like you helped finding a pet`,
    }); 
  });

  await PostModel.deleteOne({ _id: post_id });
  await ch.ack(msgBytes);
}

function sendEmail({ to, userEmail, subject, text }) {
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NOTIFICATION_EMAIL,
      pass: process.env.NOTIFICATION_PASSWORD,
    }
  });

  const message = {
    from: process.env.NOTIFICATION_EMAIL,
    to,
    subject,
    text,
  };

  transport.sendMail(message, function(err, info) {
    if (err) {
      console.log(err); // TODO how to recover from this
    } else {
      console.log(info);
    }
  });
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
