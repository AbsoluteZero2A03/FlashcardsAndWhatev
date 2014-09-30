var crypto=require("crypto");
var pg = require("pg");
var conString = "postgres://em@localhost/nodeApp1";

function encryptPass(pw) {
	var shaHmac = crypto.createHmac("sha1","superseekrit");
	var salt;
	crypto.randomBytes(32,function(ex,buf) {
		salt = buf.toString('hex');
	});
	shaHmac.update(pw+salt);
	var ret1 = shaHmac.digest('hex');
	return {
		encrypted_password: ret1,
		salt: salt
	}
}

function saveInfo(user,pw) {
	
}

function authenticate(user,pw) {

}
