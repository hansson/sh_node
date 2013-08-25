var toolbox = require('toolbox');
var gcm = require('./gcm-service');
var models = require('./models');

//This function will handle all the users queued for games
function handleQueue(db, properties,player) {
			//Find a available GameBoard that is not started, not locked and does not contain the current player
			//Update the game so that it is locked
			models.GameBoard.findOneAndUpdate({mPrivateGame: false, mStarted: false, mLocked: false, "mPlayers.mPlayerId": {$ne: player.mPlayerId}}, {mLocked: true}, function (err, gameBoard) {
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
										models.User.update({_id: user._id}, {mCurrentGames: games}).exec();
										//When all players are in the array
										if(regIds.length === players.length) {
											//Send start event with GCM
											gcm.sendGCMMessage({mGCMType: "GCM_START", mGameId: gameBoard._id}, regIds, properties);
										}
									});
								};
								
							});
						});
					//If game is not full	
				} else {
						//Update with the new user
						models.GameBoard.update({_id: gameBoard._id},{mLocked: false, mPlayers: players}).exec();
						//And put the new game in the users games
						models.User.findById(player.mPlayerId, function(err, user) {
							var games = user.mCurrentGames;
							games.push(gameBoard._id);
							models.User.update({_id: user._id}, {mCurrentGames: games}).exec();
							var regIds = [];
							regIds.push(user.mRegId);
							gcm.sendGCMMessage({mGCMType: "GCM_QUEUED", mGameId: gameBoard._id}, regIds, properties);
						});
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
					var players = [{mPlayerId: player.mPlayerId, mUsername: player.mUsername, mPosition: 0, mSwitching: true, mAccepted: true}];
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
						mPrivateGame: false,
						mPlayers: players
					});
			        //Save it
			        newGame.save();

			        //put the new game in the users games
			        models.User.findById(player.mPlayerId, function(err, user) {
			        	var games = user.mCurrentGames;
			        	games.push(newGame._id);
			        	models.User.update({_id: user._id}, {mCurrentGames: games}).exec();
			        	var regIds = [];
			        	regIds.push(user.mRegId);
			        	gcm.sendGCMMessage({mGCMType: "GCM_QUEUED", mGameId: newGame._id}, regIds, properties);
			        });
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

exports.handleQueue = handleQueue;







