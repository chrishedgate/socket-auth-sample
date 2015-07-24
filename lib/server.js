var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');
var jwt = require('jsonwebtoken');
var socketioJwt = require('socketio-jwt');

var jwtSecret = 'something';

app.set('port', process.env.PORT || 5000);
app.set('env', process.env.NODE_ENV || 'development');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(path.normalize(__dirname + '/..'), 'public')));

app.post('/login', function(req, res, next) {
  var profile = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@doe.com',
    id: 123,
    original_iat: new Date().getTime()
  };

  var token = jwt.sign(profile, jwtSecret, { expiresInSeconds: 60 });
  res.json({token: token});
});

app.post('/refresh', function(req, res, next) {
  var originalToken = req.body.original_token;
  if (!originalToken) {
    return res.status(403).send({error: 'token missing'});
  }

  jwt.verify(originalToken, jwtSecret, function(err, decoded) {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        decoded = jwt.decode(originalToken);
      } else {
        console.log(err);
        return res.status(403).send({error: err});
      }
    }

    var maxRefreshTime = 60000*5; // Allow refreshing tokens up to 5 minutes after original issued date
    if (new Date().getTime() - decoded.original_iat > maxRefreshTime) {
      console.log('token too old to refresh');
      return res.status(403).send({error: 'token too old to refresh'});
    }

    var profile = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
      id: 123,
      original_iat: decoded.original_iat
    };

    var token = jwt.sign(profile, jwtSecret, { expiresInSeconds: 60 });
    res.json({token: token});
  });
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
