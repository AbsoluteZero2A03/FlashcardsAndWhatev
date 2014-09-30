
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var https = require('https');
var path = require('path');
var app = express();
var fs = require('fs');
var redis = require('redis');
var redisClient = redis.createClient();
var pg = require('pg');

// database config
var conString = "postgres://em@localhost/nodeApp1";


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.session({store: new RedisStore({client: redisClient})})); 

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
app.get('/', function(req,res) {
	res.sendfile(__dirname + '/index.html');
});

app.post('/register', function(req,res) {
	var bod = req.body;
});

app.get('/users', user.list);
/*
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
*/
options = { 
	pfx: fs.readFileSync('keys/server.pfx')
}

var server = https.Server(options, app); 
var io = require('socket.io')(server)
server.listen(3000);
io.set('origins', 'https://24.85.181.194:3000');
io.on('connection', function(socket) {
	socket.emit('news', {hello: 'world'});
	socket.on('my other event', function(data) {
		console.log(data);
	});
	socket.on("msgSend", function(data) {
		console.log(data);
		io.sockets.emit("newmsg", {
			content: data.content
		});
	});
});
