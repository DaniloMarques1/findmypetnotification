# Find my Pet Notification

Notification service, this project's main purpose is to send an email notification
after consuming a rabbit MQ queue, the findmypetapi will push a message to the queue
in two situations:

1. When someone comments on my post
2. When i change a post status

When the first situation occurs we will consume a message, save the comment author
email, and then send an email to the post owner informing that a comment has
been made to one of his posts.

The second situation will happen when a post owner updates the status of a post,
informing that a pet was found. Once that happens, everybody who commented on the
post will receive an email notification showing that he helped (by commenting)
to find a pet.

We will be using mongodb to save everybody who has commented on a post so we
can then use it for situation 2.

### Technologies used

* Mongodb
* Nodejs
* Rabbit MQ
