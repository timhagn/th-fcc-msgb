/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';
// For local development.
require('dotenv').config();

const expect = require('chai').expect;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const shortid = require('shortid');
const bcrypt = require('bcrypt');

// Connect to DB.
mongoose.connect(
    process.env.MONGO_URI || process.env.MONGO_LOCAL,
    { useNewUrlParser: true }
);

// Anonymous Message Board - Schemas
// Messages
const MessageSchema = new Schema({
  _id: {
    type: Schema.Types.Mixed,
    default: shortid.generate
  },
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
});
// Threads
const ThreadSchema = new Schema({
  _id: {
    type: Schema.Types.Mixed,
    default: shortid.generate
  },
  board: { type: String, required: true },
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  replies: [ MessageSchema ]
});
const Thread = mongoose.model('Thread', ThreadSchema);

module.exports = function (app) {

  // Async function to Create a Thread.
  function createThread(threadObject) {
    return new Promise((resolve, reject) => {
      let threadToSave = new Thread( threadObject );
      threadToSave.save((err, thread) =>
          err ? reject(null) : resolve(thread));
    });
  }

  // Async function to get Thread by thread_id.
  function findThreadById(thread_id) {
    return new Promise((resolve, reject) => {
      Thread.findById(thread_id)
          .select('-reported -delete_password')
          .exec((err, thread) => err ? reject(null) : resolve(thread))
    });
  }

  // Async function to get complete Thread by thread_id.
  function getCompleteThreadById(thread_id) {
    return new Promise((resolve, reject) => {
      Thread.findById(
          thread_id,
          (err, thread) => err ? reject(null) : resolve(thread)
      );
    });
  }

  // Async function to get newest 10 Threads on Board.
  function getNewestThreads(board) {
    return new Promise((resolve, reject) => {
      Thread.find({ board: board })
          .limit(10)
          .sort({ bumped_on: -1 })
          .select('-reported -delete_password')
          .exec((err, thread) => err ? reject(null) : resolve(thread))
    });
  }

  // Async function to delete Thread by thread_id.
  function deleteThreadById(thread_id) {
    return new Promise((resolve, reject) => {
      Thread.findByIdAndDelete(
          thread_id,
          (err, thread) => err ? reject(null) : resolve(thread)
      );
    });
  }

  app.route('/api/threads/:board')
      // Create new Thread.
      .post(async function (req, res) {
        let board = req.params.board;
        let text = req.body.text;
        let delete_password = req.body.delete_password;
        if (board && text && delete_password) {
          let hash = bcrypt.hashSync(delete_password, 12);
          let threadObject = {
            board,
            text,
            delete_password: hash
          };
          let thread = await createThread(threadObject);
          if (thread) {
            res.redirect('/b/' + board);
          }
          else {
            res.send('thread creation failure');
          }
        }
        else {
          res.send('missing fields')
        }
      })

      // Get newest Threads.
      .get(async function (req, res) {
        let board = req.params.board;
        if (board) {
          let threads = await getNewestThreads(board);
          if (threads) {
            threads.forEach(item => {
              item._doc.replycount = item.replies.length;
            });
            res.json(threads);
          }
          else {
            res.json({});
          }
        }
        else {
          res.send('board not found')
        }
      })

      // Report Thread.
      .put(async function (req, res) {
        let board = req.params.board;
        let thread_id = req.body.thread_id;
        if (board && thread_id) {
          let thread = await getCompleteThreadById(thread_id);
          if (thread) {
            thread.reported = true;
            thread.save((err, data) => {
              err ? res.send('failure reporting thread') :
                  res.send('success');
            });
          }
          else {
            res.send('thread not found');
          }
        }
        else {
          res.send('missing fields')
        }
      })

      // Delete Thread.
      .delete(async function (req, res) {
        let board = req.params.board;
        if (board) {
          let thread_id = req.body.thread_id;
          let thread_delete_password = req.body.delete_password;
          if (thread_id && thread_delete_password) {
            let thread = await getCompleteThreadById(thread_id);
            if (thread) {
              if (bcrypt.compareSync(thread_delete_password, thread.delete_password)) {
                let deletedThread = deleteThreadById(thread_id);
                if (deletedThread) {
                  res.send('success');
                }
                else {
                  res.send('failure deleting thread')
                }
              }
              else {
                res.send('incorrect password')
              }
            }
            else {
              res.send('thread not found')
            }
          }
          else {
            res.send('missing fields')
          }
        }
        else {
          res.send('board not found')
        }
      });


    
  app.route('/api/replies/:board/')
      // Create new Reply.
      .post(async function (req, res) {
        let board = req.params.board;
        let text = req.body.text;
        let delete_password = req.body.delete_password;
        let thread_id = req.body.thread_id;
        if (board && text && delete_password && thread_id) {
          let thread = await findThreadById(thread_id);
          if (thread) {
            let hash = bcrypt.hashSync(delete_password, 12);
            let msgObject = {
              board,
              text,
              delete_password: hash
            };
            thread.replies.push(msgObject);
            thread.bumped_on = new Date();
            thread.save((err, data) => {
              err ? res.send('reply creation failed') :
                  res.redirect('/b/' + board + '/' + thread_id);
            });
          }
          else {
            res.send('thread not found');
          }
        }
        else {
          res.send('missing fields')
        }
      })

      // Get Thread.
      .get(async function (req, res) {
        let board = req.params.board;
        let thread_id = req.query.thread_id;
        if (board && thread_id) {
          let thread = await findThreadById(thread_id);
          if (thread) {
            thread.replies.forEach(item => {
              delete item._doc.reported;
              delete item._doc.delete_password;
            });
            res.json(thread);
          }
          else {
            res.json({});
          }
        }
        else {
          res.send('thread not found on board')
        }
      })

      // Report Reply.
      .put(async function (req, res) {
        let board = req.params.board;
        let thread_id = req.body.thread_id;
        let reply_id = req.body.reply_id;
        if (board && thread_id && reply_id) {
          let thread = await getCompleteThreadById(thread_id);
          if (thread && thread.replies.id(reply_id)) {
            thread.replies.id(reply_id).reported = true;
            thread.save((err, data) => {
              err ? res.send('failure reporting reply') :
                    res.send('success');
            });
          }
          else {
            res.send('thread or reply not found');
          }
        }
        else {
          res.send('missing fields')
        }
      })

      // Delete Reply.
      .delete(async function (req, res) {
        let board = req.params.board;
        if (board) {
          let thread_id = req.body.thread_id;
          let reply_id = req.body.reply_id;
          let reply_delete_password = req.body.delete_password;
          if (thread_id && reply_id && reply_delete_password) {
            let thread = await getCompleteThreadById(thread_id);
            if (thread) {
              if (bcrypt.compareSync(reply_delete_password, thread.replies.id(reply_id).delete_password)) {
                thread.replies.id(reply_id).text = '[deleted]';
                thread.save((err, data) => {
                  err ? res.send('failure deleting reply') :
                        res.send('success');
                });
              }
              else {
                res.send('incorrect password');
              }
            }
            else {
              res.send('thread not found')
            }
          }
          else {
            res.send('missing fields')
          }
        }
        else {
          res.send('board not found')
        }
      });


  app.get('/drop', function(req, res) {
    //if successful response will be 'complete delete successful'
    Thread.deleteMany( { } , (err, stock) =>
        err ?
            res.send('complete delete error') :
            res.send('complete delete successful')
    );
  });
};
