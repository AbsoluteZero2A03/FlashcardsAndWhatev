/**
 * Module dependencies.  */

var express = require('express');
//var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var https = require('https');
var path = require('path');
var app = express();
var fs = require('fs');
var redis = require('redis');
var RedisStore = require('connect-redis')(express);
var redisClient = redis.createClient();
var pg = require('pg');
var accounts = require('./accounts.js');
var flashcards = require("./flashcards.js");
var flash = require("connect-flash");
var url = require("url");

// database config
var conString = "postgres://em@localhost/nodeApp1";


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser());


var session_store = new RedisStore({client: redisClient});

app.use(express.session({cookie: {path: '/', httpOnly: false, maxAge: 24*60*60*1000},secret: "superseekrit", store: session_store})); 
app.use(flash());
app.use(app.router);
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
app.get('/', function(req,res) {
	var render_options = {}
	render_options.message = req.flash('message');
	render_options.userid = req.session.userid;
	console.log(req.session.userid);
	if (req.session.userid) {
		flashcards.getAllDecksFromUser(req.session.userid,function(decknames) {
			console.log("DECKNAMES "+JSON.stringify(decknames));
			render_options.decks = decknames;
			res.render('index', render_options);
		});
	} else {
		render_options.decks = null;
		res.render('index',render_options);
	}
});

app.get('/chat',function(req,res) {
	var room = req.query.room;
	if (!room) {
		req.flash("message","Room doesn't exist!");
		res.redirect('/');
	}
	if (req.session.userid) {
		res.render('chat',{room:room});
	} else {
		req.flash("message","please log in!");
		res.redirect('/');	
	}
});

app.get('/register_form', function(req,res) {
	res.sendfile(__dirname + '/register.html');
});

/*app.get('/session_gest', function(req,res) {
	res.send(req.session);
});*/

app.get('/logout', function(req,res) {
	req.session.userid = null;
	res.redirect('/');
});

app.post('/register', function(req,res) {
	var bod = req.body;
	accounts.saveInfo(bod.username, bod.password, 
		function(){
			req.session.userid = bod.username;		
			res.redirect('/');
		},
		function(){
			req.flash('message', 'already taken, sorry!');
			res.redirect('/');
		}	
	);	
});

app.post('/login', function(req,res) {
	var bod = req.body;
	accounts.authenticate(bod.username,bod.password,
		function() {
			req.session.userid=bod.username;
			res.redirect('/');
		},
		function() {
			console.log('not authenticated');
			res.redirect('/');
		}
	);
});

app.get('/login_form', function(req,res) {
	res.sendfile(__dirname + "/login_form.html");
});

app.get('/users', user.list);
app.get('/flashcards',function(req,res){
	res.render("flashcards");	
})

app.post('/setFlashCards',function(req,res) {
	var deckname = req.body.name;
	var fronts = JSON.parse(req.body.fronts);
	var backs = JSON.parse(req.body.backs);
	var fls = []
	console.log(req.session.userid);
	var x = req.session.userid;
	for (var i=0;i<fronts.length;i++) {
		fls.push({front:fronts[i],back:backs[i]});	
	}
	flashcards.storeData(deckname,fls,x,function() {
		res.redirect('/');
	});
});

app.get('/deck',function(req,res){
	var deckid = req.query.id;
	
	flashcards.checkIfDeckBelongsToUser(deckid,req.session.userid, 
	function() {
		flashcards.getCards(deckid,function(cards) {
			res.render("deck",{cards:cards});
		});
	},
	function() {
		req.flash("message","not yours!");
		res.redirect("/");
	});
});

app.get('/edit_deck',function(req,res) {
	var deckid = req.query.id;
	
	flashcards.checkIfDeckBelongsToUser(deckid,req.session.userid, 
		function() {
			flashcards.getCards(deckid,function(cards) {
				flashcards.getDeckName(deckid, function(name) {
					res.render("edit_deck",{deckname:name, cards:cards});
				});
			});
		},
		function() {
			req.flash("message","not yours!");
			res.redirect("/");
		}
	);
});

options = { 
	pfx: fs.readFileSync('keys/server.pfx')
}


var server = https.Server(options, app); 
var io = require('socket.io')(server)
var parseCookie = require('cookie').parse;

server.listen(3000);
io.set('origins', 'https://24.85.223.82:3000/');
io.timeouts = {}
io.use(function(socket, next){
  if (socket.request.headers.cookie) {
		var s = parseCookie(socket.request.headers.cookie)['connect.sid']
		redisClient.get('ses'+s.substr(0,s.indexOf(".")),function(err,reply) {
			socket.cookie = reply;
			next();
		});
	}
  next(new Error('Authentication error'));
});


io.on('connection', function(socket) {
	socket.on('my other event', function(data) {
		console.log(data);
	});
	socket.on("msgSend", function(data) {
		console.log(data);
		if (JSON.parse(socket.cookie)["userid"] && data.content.replace(/^\s+|\s+$/g, '')!="") {
			io.to(data.room).emit("newmsg", {
				content:JSON.parse(socket.cookie)["userid"]+": "+data.content
			});
		}
	});
	socket.on("join",function(data) {
		console.log("join: "+JSON.stringify(data));
		socket.join(data.room);
		console.log(typeof socket.rooms[0]);
	});
	socket.on("init_deck",function(data) {
		io.timeouts[data.room] ? clearTimeout(io.timeouts[data.room]) : false
		io.timeouts[data.room] = setTimeout(function() {
			function d(deck,num) {
				io.to(data.room).emit("disp_card",{
						card: deck[num]
				});
			}	
			d(data.deck,20000);
		},0);
	});
});
