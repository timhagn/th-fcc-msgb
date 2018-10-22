/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

const chaiHttp = require('chai-http');
const chai = require('chai');
chai.use(require('chai-url'));
const assert = chai.assert;
const server = require('../server');
const bcrypt = require('bcrypt');

chai.use(chaiHttp);

let preSavedThreadId, preSavedReplyId;

suite('Functional Tests', function() {

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      test('Create Thread required fields filled in', function(done) {
        chai.request(server)
            .post('/api/threads/general')
            .send({
              text: 'New Thread',
              delete_password: 'password',
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.isArray(res.redirects, 'redirects should be array');
              assert.equal(res.redirects.length, 1, 'redirects should be array of length 1');
              done();
            });
      });

      test('Missing required fields', function(done) {
        chai.request(server)
            .post('/api/threads/general')
            .send({
              text: 'New Thread'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              console.log(res.text);
              assert.equal(res.text, 'missing fields');
              done();
            });
      });


    });
    
    suite('GET', function() {
      test('GET newest 10 threads', function(done) {
        chai.request(server)
            .get('/api/threads/general')
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.isArray(res.body, 'response should be an array');
              assert.isObject(res.body[0], 'first thread should be an object');
              assert.equal(res.body[0].board, 'general', 'board should be general');
              assert.property(res.body[0], 'board', 'first thread should have board');
              assert.property(res.body[0], 'replies', 'first thread should have replies');
              assert.isArray(res.body[0].replies, 'replies should be an array');
              assert.property(res.body[0], 'bumped_on', 'first thread should have bumped_on');
              assert.property(res.body[0], 'created_on', 'first thread should have created_on');
              assert.property(res.body[0], 'replycount', 'first thread should have replycount');
              assert.property(res.body[0], 'text', 'first thread should have text');
              assert.property(res.body[0], '_id', 'first thread should have _id');
              // Save thread_id for later testing.
              preSavedThreadId = res.body[0]._id;
              done();
            });
      });
    });

    suite('PUT', function() {
      test('Report Thread with incorrect thread id', function(done) {
        chai.request(server)
            .put('/api/threads/general')
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'missing fields');
              done();
            });
      });
      test('Report Thread with incorrect thread id', function(done) {
        chai.request(server)
            .put('/api/threads/general')
            .send({
              thread_id: '123',
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'thread not found');
              done();
            });
      });
      test('Report Thread', function(done) {
        chai.request(server)
            .put('/api/threads/general')
            .send({
              thread_id: preSavedThreadId,
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'success');
              done();
            });
      });
    });
    

  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {
      test('Create Reply required fields filled in', function(done) {
        chai.request(server)
            .post('/api/replies/general/')
            .send({
              text: 'New Reply',
              delete_password: 'password',
              thread_id: preSavedThreadId
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.isArray(res.redirects, 'redirects should be array');
              assert.equal(res.redirects.length, 1, 'redirects should be array of length 1');
              done();
            });
      });

      test('Missing required fields', function(done) {
        chai.request(server)
            .post('/api/replies/general/')
            .send({
              text: 'New Reply',
              thread_id: preSavedThreadId
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              console.log(res.text);
              assert.equal(res.text, 'missing fields');
              done();
            });
      });

      test('Missing required fields', function(done) {
        chai.request(server)
            .post('/api/replies/general/')
            .send({
              text: 'New Reply',
              delete_password: 'password',
              thread_id: 'notexisting'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'thread not found');
              done();
            });
      });
    });

    suite('GET', function() {
      test('GET threads', function(done) {
        chai.request(server)
            .get('/api/replies/general/')
            .query({thread_id: preSavedThreadId})
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.isObject(res.body, 'response should be an object');
              assert.property(res.body, 'board', 'first thread should have board');
              assert.equal(res.body.board, 'general', 'board should be general');
              assert.property(res.body, 'replies', 'first thread should have replies');
              assert.isArray(res.body.replies, 'replies should be an array');
              assert.property(res.body, 'bumped_on', 'first thread should have bumped_on');
              assert.property(res.body, 'created_on', 'first thread should have created_on');
              assert.property(res.body, 'text', 'first thread should have text');
              assert.property(res.body, '_id', 'first thread should have _id');
              done();
            });
      });
    });

    suite('PUT', function() {
      test('Report Reply with incorrect missing fields', function(done) {
        chai.request(server)
            .get('/api/threads/general')
            .then(function(res){
              preSavedReplyId = res.body[0].replies[0]._id;
              chai.request(server)
                  .put('/api/replies/general/')
                  .send({
                    reply_id: '123'
                  })
                  .end(function(err, res){
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'missing fields');
                    done();
                  });
            });
      });
      test('Report Reply with incorrect reply_id', function(done) {
        chai.request(server)
            .get('/api/threads/general')
            .then(function(res){
              preSavedReplyId = res.body[0].replies[0]._id;
              chai.request(server)
                  .put('/api/replies/general/')
                  .send({
                    thread_id: preSavedThreadId,
                    reply_id: '123'
                  })
                  .end(function(err, res){
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'thread or reply not found');
                    done();
                  });
            });
      });
      test('Report Reply', function(done) {
        chai.request(server)
            .get('/api/threads/general')
            .then(function(res){
              preSavedReplyId = res.body[0].replies[0]._id;
              chai.request(server)
                  .put('/api/replies/general/')
                  .send({
                    thread_id: preSavedThreadId,
                    reply_id: preSavedReplyId
                  })
                  .end(function(err, res){
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'success');
                    done();
                  });
            });
      });
    });

    suite('DELETE', function() {
      test('Delete reply with missing fields', function(done) {
          chai.request(server)
              .delete('/api/replies/general/')
              .send({
                thread_id: preSavedThreadId,
              })
              .end(function(err, res){
                assert.equal(res.status, 200);
                assert.equal(res.text, 'missing fields');
                done();
              });
      });

      test('Try to delete reply on nonexistent thread', function(done) {
        chai.request(server)
            .delete('/api/replies/general/')
            .send({
              thread_id: 'notexistent',
              reply_id: preSavedReplyId,
              delete_password: '123'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'thread not found');
              done();
            });
      });

      test('Delete reply with incorrect password', function(done) {
        chai.request(server)
            .delete('/api/replies/general/')
            .send({
              thread_id: preSavedThreadId,
              reply_id: preSavedReplyId,
              delete_password: '123'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'incorrect password');
              done();
            });
      });

      test('Delete reply with correct password', function(done) {
        chai.request(server)
            .delete('/api/replies/general/')
            .send({
              thread_id: preSavedThreadId,
              reply_id: preSavedReplyId,
              delete_password: 'password'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'success');
              done();
            });
      });
    });
    
  });

  suite('API ROUTING FOR /api/threads/:board deletion', function() {

    suite('DELETE', function() {
      test('Delete thread with missing fields', function(done) {
        chai.request(server)
            .delete('/api/threads/general')
            .send({
              thread_id: preSavedThreadId,
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'missing fields');
              done();
            });
      });

      test('Try to delete nonexistent thread', function(done) {
        chai.request(server)
            .delete('/api/threads/general')
            .send({
              thread_id: 'notexistent',
              delete_password: '123'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'thread not found');
              done();
            });
      });

      test('Delete thread with incorrect password', function(done) {
        chai.request(server)
            .delete('/api/threads/general')
            .send({
              thread_id: preSavedThreadId,
              delete_password: '123'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'incorrect password');
              done();
            });
      });

      test('Delete thread with correct password', function(done) {
        chai.request(server)
            .delete('/api/threads/general')
            .send({
              thread_id: preSavedThreadId,
              delete_password: 'password'
            })
            .end(function(err, res){
              assert.equal(res.status, 200);
              assert.equal(res.text, 'success');
              done();
            });
      });
    });
  });

});
