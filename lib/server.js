var express = require('express');
var app = express();
var path = require('path');
var jwt = require('jsonwebtoken');
var socketioJwt = require('socketio-jwt');

var jwtSecret = 'something';

app.set('port', process.env.PORT || 5000);
app.set('env', process.env.NODE_ENV || 'development');

app.use(express.static(path.join(path.normalize(__dirname + '/..'), 'public')));

app.post('/login', function(req, res, next) {
  var profile = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@doe.com',
    id: 123
  };

  var token = jwt.sign(profile, jwtSecret, { expiresInSeconds: 60 });

  res.json({token: token});
});

var server = require('http').createServer(app);
var io = require('socket.io')(server);

io
  .on('connection', socketioJwt.authorize({ secret: jwtSecret, timeout: 15000 }))
  .on('authenticated', function(socket) {
    console.log('authenticated: '+JSON.stringify(socket.decoded_token));

    socket.on('disconnect', function () {
      console.log('disconnect');
    });

    socket.on('ping', function() {
      socket.emit('pong');
    });
  });

exports.start = function(done) {
  server.listen(app.get('port'), function(err) {
    console.log(app.get('env') + " is listening on port " + app.get('port'));
    if (typeof done == 'function') {
      done(err);
    }    
  });
};

exports.stop = function() {
  server.close();
};
