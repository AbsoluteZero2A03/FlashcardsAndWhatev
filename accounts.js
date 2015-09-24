var crypto=require("crypto");
var pg = require("pg");
var util = require("util");
var conString = "postgres://em@localhost/nodeApp1";

function encryptPass(pw) {
	var shaHmac = crypto.createHmac("sha1","superseekrit");
	var salt = crypto.randomBytes(32).toString('hex');
	shaHmac.update(pw+salt);
	var ret1 = shaHmac.digest('hex');
	return {encrypted_password: ret1, salt: salt}
}


function saveInfo(user,pw,success,failure) {
	var encpwdata = encryptPass(pw);
	this.userExists = null;
	var conString = "postgres://em@localhost/nodeApp1";
	var m = user;	

	var client = new pg.Client({user:'em',daatabse:'nodeApp1'});
	client.on('drain', client.end.bind(client));
	
	pg.connect(conString,function(err,client,done) {
		if (err) {
			return console.error('error fetching client from pool',err);
		}
		client.query("select exists(select 1 from accounts where username=$1)" , [user], function(err,result){	
			if (result.rows[0]['?column?'] == true) {
				failure();	
			} else {
				client.query("INSERT INTO accounts(username, enc_password, salt) VALUES ($1,$2,$3)", [user,encpwdata.encrypted_password, encpwdata.salt], function(err,result2) {
				if (err) {
					return console.error('error running query (damn1): ', err);
				}		
					success();
					client.end();
				});
			}	
		});
	});	
	pg.end();
}

function authenticate(user,pw,success,failure) {
	var conString = "postgres://em@localhost/nodeApp1";

	pg.connect(conString,function(err,client,done) {
		if(err) {
			return failure();
		}
		client.query("SELECT enc_password,salt FROM accounts WHERE username=$1", [user], function(err,result) {
			var data = result.rows[0];
			if (!(data)) {
				return failure();
			}
			if (err) {
				return failure();
			}
			var shaHmac = crypto.createHmac("sha1", "superseekrit");
			shaHmac.update(pw+data.salt);
			if (shaHmac.digest('hex') == data.enc_password) {
				success();
			} else {
				failure();
			}
			client.end();
		});
	});		
}

module.exports = { encryptPass: encryptPass, saveInfo: saveInfo, authenticate:authenticate };
