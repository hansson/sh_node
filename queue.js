var fs = require('fs');
var exec = require('child_process').exec;
var sleep = require('sleep');
var toolbox = require('toolbox');
var mongoose = require('mongoose');
var gcm = require('./gcm-service');
var models = require('./models');

//DB Connection
mongoose.connect('mongodb://shit:2kTpdbiassSH!@ds051577.mongolab.com:51577/sh_test');
var db = mongoose.connection;

console.log("Running queue handler");

//This function will handle all the users queued for games
function handleQueue() {
	//Find out if there is any files with new users
	exec('ls ./queue', function(err, stdout, stderr) {
		//Put file names into array
		var queueFiles = stdout.split("\n");
		//If files exist
		if(queueFiles.length > 0 && queueFiles[0].length > 10) {
			//Read the player from the first file
			var player = JSON.parse(fs.readFileSync("./queue/" + queueFiles[0], encoding = "utf8"));
			//Find a available GameBoard that is not started, not locked and does not contain the current player
			//Update the game so that it is locked
			models.GameBoard.findOneAndUpdate({mStarted: false, mLocked: false, "mPlayers.mPlayerId": {$ne: player.mPlayerId}}, {mLocked: true}, function (err, gameBoard) {
				//If a game was found
				if(gameBoard) {
					//Get all players in the game
					var players = gameBoard.mPlayers;
					//Append the new player to the game
					players.push({mPlayerId: player.mPlayerId, mUsername: player.mUsername, mPosition: 0, mSwitching: true});
					//If game is full
					if(players.length === 4) {
						//Deal cards
						deal(gameBoard, players, function(updatedGame, updatedPlayers) {
							//Update the game with the new player list
							models.GameBoard.update({_id: gameBoard._id},{mLocked: false, mPlayers: updatedPlayers, mStarted: true, mSwitching: true, mStartedAt: Date.now(), mDeck: updatedGame.mDeck}, function(err, updatedGame) {
								var regIds = [];
								//Iterate players
								for (var i = players.length - 1; i >= 0; i--) {
									//Find every players matching User
									models.User.findById(players[i].mPlayerId, function(err, user) {
										//Append the regId of the current user to the list of regIds
										regIds.push(user.mRegId);

										var games = user.mCurrentGames;
										games.push(gameBoard._id);
										models.User.update({_id: user._id,}, {mCurrentGames: games}).exec();
										//When all players are in the array
										if(regIds.length === players.length) {
											//Send start event with GCM
											gcm.sendGCMMessage({mGCMType: "GCM_START", mGameId: gameBoard._id}, regIds);
										}
									});
								};
								
							});
						});
					//If game is not full	
					} else {
						//Update with the new user
						models.GameBoard.update({_id: gameBoard._id},{mLocked: false, mPlayers: players}).exec();
					}
				//If no game was found	
				} else {
					var pos = 0;
					var deck = [];
					//Create a deck
					for (var i = 1; i <= 4; i++) {
						for (var j = 2; j < 15; j++) {
							deck[pos] = {mValue: j, mSuit: i};
							pos++;
						};
					};
					//Shuffle it
					deck = toolbox.shuffle(deck);
					//The current player
					var players = [{mPlayerId: player.mPlayerId, mUsername: player.mUsername, mPosition: 0, mSwitching: true}];
					//Create the new game
					var newGame = new models.GameBoard({
				    	mDeck: deck,
				    	mChanceTaken: false,
    					mCurrentPlayer: 0,
    					mCurrentPlayerName: "-",
    					mFinished: false,
    					mLocked: false,
    					mNumberOfPlayers: 4,
    					mRoundLength: 60,
    					mStarted: false,
    					mSwitching: false,
    					mPlayers: players
			        });
			        //Save it
			        newGame.save();	
				}

				//Done with this queue item, handle next
				exec('rm ./queue/' + queueFiles[0], function(err, stdout, stderr) {
				});	
				handleQueue();
					
				});
		} else {
			process.exit(0);
		}
	});
}


function deal(gameBoard, players,  callback) {
	for (var i = players.length - 1; i >= 0; i--) {
		for (var j = 2 ; j >= 0; j--) {
			players[i].mHand.push(gameBoard.mDeck.pop());
			players[i].mFaceDown.push(gameBoard.mDeck.pop());
			players[i].mFaceUp.push(gameBoard.mDeck.pop());
		};
	};

	callback(gameBoard, players)
}


handleQueue();





