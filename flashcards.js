var pg = require("pg");

var conString = "postgres://em@localhost/nodeApp1";

function storeData(deckname,fls,user,ondone) {
	console.log(user);
	pg.connect(conString,function(err,client,done) {
		client.query("INSERT INTO decks (name) VALUES ($1) RETURNING id",[deckname],function(err,result){
			var deck_id = result.rows[0].id;
			client.query("SELECT id FROM accounts WHERE username=$1",[user],function(err,result){
				var user_id = result.rows[0].id;
				client.query("INSERT INTO relations_users_decks (user_id,deck_id) VALUES ($1,$2)",[user_id,deck_id],function(err,result) {});
			});
			for (var i in fls) { 
				client.query("INSERT INTO flashcards (front,back) VALUES ($1,$2) RETURNING id", [fls[i].front,fls[i].back], function(err,result) {
					var flash_id = result.rows[0].id;
					client.query("INSERT INTO relations (flashcard_id,deck_id) VALUES ($1,$2)",[flash_id, deck_id],function(err,result){});
					
				});
			}
			ondone();
		});
	});	
}

function getCards(deckid,ondone) {
	pg.connect(conString,function(err,client,done){ 
		client.query("SELECT id,front,back,deck_id FROM flashcards INNER JOIN relations ON flashcards.id = relations.flashcard_id WHERE deck_id=$1",[deckid],function(err,result) {
			var cards = result.rows;
			ondone(cards);	
		});	
	});
}

function getDeckName(deckid,ondone) {
	pg.connect(conString,function(err,client,done){ 
		client.query("SELECT name from decks WHERE deckid=$1",[deckid],function(err,result) {
			ondone(result.rows[0].name);
		});	
	});
}

function checkIfDeckBelongsToUser(deckid,user,success,failure) {
	pg.connect(conString,function(err,client,done) {
		client.query ("SELECT id FROM accounts WHERE username=$1",[user], function(err,result) {
			if (err) { return console.log(err); }
			var id = result.rows[0].id;
			client.query ("SELECT exists(SELECT 1 from relations_users_decks where user_id=$1 and deck_id=$2)",[id,deckid],function(err,result){
				if (err) {console.log(err)}
				if (result.rows[0]['?column?'] == true ) {
					success();
				} else {
					failure();
				}
			});
		});
	});
}

function getAllDecksFromUser(user,ondone) {
	console.log("USER "+user);
	pg.connect(conString,function(err,client,done){
		client.query("SELECT id FROM accounts WHERE username=$1",[user],function(err,result) {
			if (err) { console.log(err);return ondone([]); }
			var id = result.rows[0].id;
			client.query("SELECT deck_id, name FROM relations_users_decks INNER JOIN decks ON relations_users_decks.deck_id = decks.id WHERE user_id=$1",[id],function(err,result) {
				if (err) {console.log(err);}
				var decks = result.rows;
				console.log(JSON.stringify(decks));
				ondone(decks);
			});	
		});
	});
}

module.exports = { storeData: storeData, getCards: getCards, checkIfDeckBelongsToUser: checkIfDeckBelongsToUser, getAllDecksFromUser: getAllDecksFromUser, getDeckName: getDeckName }
