/**
*	npm install mongodb
*	npm install mongoose
*/

var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");
var mongoose = require('mongoose');
var prop = require('properties-parser');


//HTTP Mappings
var handle = {}
handle["/login"] = requestHandlers.login;
handle["/register"] = requestHandlers.register;
handle["/find"] = requestHandlers.findQuickGame;
handle["/game"] = requestHandlers.getGameState;
handle["/switch"] = requestHandlers.switchCards;
handle["/games"] = requestHandlers.findGames;
handle["/move"] = requestHandlers.makeMove;
handle["/move/face-down"] = requestHandlers.makeMoveFaceDown;
handle["/friends/list"] = requestHandlers.listFriends;
handle["/friends/accept"] = requestHandlers.acceptFriend;

//Read properties
prop.read("deployment.properties", function(err, properties) {
	//Database connection
	mongoose.connect(properties["mongo-url"]);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function startServer() {
		server.start(router.route, handle, db, properties);
	});	
});


