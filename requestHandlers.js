var exec = require("child_process").exec;
var fs = require('fs');
var models = require('./models');
var gameHandler = require('./gameHandler');
var friendHandler = require('./friendHandler');
var gcm = require('./gcm-service');

/***************************************
****************************************
Authentication functions
****************************************
****************************************/

function login(response, postData, db, properties) {

  //Get request data
  var request = JSON.parse(postData);

  //Find a user with the given username and password
  models.User.findOne({mUsername: request.mUsername, mPassword: request.mPassword}, function (err, user) {
    if (err); // TODO handle err
    //Write response header
    response.writeHead(200, {"Content-Type": "application/json"});
    //If user found
    if(user) {
      //Generate sesion id
      require('crypto').randomBytes(32, function(ex, buf) {
        var authResponse = {
          mSessionId: buf.toString('hex'),
          mStatus: "OK"
        }
        //response with session id
        response.end(JSON.stringify(authResponse));
        //if reg id has changed
        if(request.mRegId) {
         user.mRegId = request.mRegId;
       }
        //Update user with new session id and reg id
        models.User.update({mUsername: request.mUsername},{mRegId: user.mRegId, mSessionId: authResponse.mSessionId}).exec();
      });
    //If user not found
  } else {
    var authResponse = {
      mStatus: "INVALID_CREDENTIALS"
    }
      //Send invalid credentials response
      response.end(JSON.stringify(authResponse));
    }
  });
}

function register(response, postData, db, properties) {
  //Get request data
  var request = JSON.parse(postData);
  //If request contains all mandatory fields
  if(request.mUsername && request.mPassword && request.mEmail) {
    //Look for a user with same  username or email
    models.User.find({$or : [{mUsername: request.mUsername}, {mEmail: request.mEmail}]}, function (err, user) {
      if (err); // TODO handle err
      //Write response header
      response.writeHead(200, {"Content-Type": "application/json"});
      //If no user was found
      if(user.length === 0) {
        var basicResponse = {
          mStatus: "OK"
        }
        //Send ok to client
        response.end(JSON.stringify(basicResponse));
        //Create basic user
        var newUser = new models.User({
          mUsername: request.mUsername,
          mPassword: request.mPassword,
          mEmail: request.mEmail,
          mRegId: request.mRegId,
          mActive: true,
          mCreated: Date.now()
        });
        //Save it
        newUser.save();
      } else {
      //If user found
      //Send user exists response
      var existsResponse = {
        mStatus: "EMAL_OR_USERNAME_EXISTS"
      }
      response.end(JSON.stringify(existsResponse));
    }
  });
  } else {
    //If not all fields
    var nokResponse = {
      mStatus: "NOT_OK"
    }
    response.end(JSON.stringify(nokResponse));
  }
}

/***************************************
****************************************
Game functions
****************************************
****************************************/

function findQuickGame(response, postData, db, properties) {

  //Get request data
  var request = JSON.parse(postData);

  //Find the user with the specified sessionId
  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    //Prepare user with 200 response code
    response.writeHead(200, {"Content-Type": "application/json"});
    //If a user was found
    if(user) {
      //Set status to "OK"
      var basicResponse = {
        mStatus: "OK"
      }
      //Return response to the user
      response.end(JSON.stringify(basicResponse));
      //Prepare a player object for the queue
      var player = {
        mPlayerId: user._id,
        mUsername: user.mUsername
      }
      //Write to new queue file
      fs.writeFile("./queue/" + Date.now() + user.mUsername + ".queue", JSON.stringify(player));
    } else {
      //If no user was found return invalid credentials
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      }
      response.end(JSON.stringify(invalidResponse));
    }
  });
}

function findGameInviteFriend(response, postData, db, properties) {

  //Get request data
  var request = JSON.parse(postData);

  //Find the user with the specified sessionId
  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    //Prepare user with 200 response code
    response.writeHead(200, {"Content-Type": "application/json"});
    //If a user was found
    if(user && players.length < 4) {

      //Populate friends
      var players = [];
      for (var i = request.mFriends.length - 1; i >= 0; i--) {
        players.push({mPlayerId: request.mFriends[i]._id, mUsername: request.mFriends[i].mUsername, mPosition: 0, mSwitching: true, mAccepted: false});
      };

      players.push({mPlayerId: user._id, mUsername: user.mUsername, mPosition: 0, mSwitching: true, mAccepted: true});

      if (request.mPrivateGame && players.length == 1) {
        //Private game and no friends is NOT_OK
        var noFriendResponse = {
          mStatus: "NOT_OK"
        }
        response.end(JSON.stringify(noFriendResponse));
        return;
      };

      var playerAmount = 4;
      if(request.mPrivateGame) {
        playerAmount = players.length;
      }

      //Create a deck
      var pos = 0;
      var deck = [];

      for (var i = 1; i <= 4; i++) {
        for (var j = 2; j < 15; j++) {
          deck[pos] = {mValue: j, mSuit: i};
          pos++;
        };
      };
      //Shuffle it
      deck = toolbox.shuffle(deck);

      //Create the new game
      var newGame = new models.GameBoard({
        mDeck: deck,
        mChanceTaken: false,
        mCurrentPlayer: 0,
        mCurrentPlayerName: "-",
        mFinished: false,
        mLocked: false,
        mNumberOfPlayers: playerAmount,
        mRoundLength: 60,
        mStarted: false,
        mSwitching: false,
        mPrivateGame: request.mPrivateGame,
        mPlayers: players
      });
      //Save it
      newGame.save(); 

      //Set status to "OK"
      var basicResponse = {
        mStatus: "OK"
      }
      //Return response to the user
      response.end(JSON.stringify(basicResponse));
  } else {
      //If no user was found return invalid credentials
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      }
      response.end(JSON.stringify(invalidResponse));
    }
  });
}


function getGameState(response, postData, db, properties) {

  //Get request data
  var request = JSON.parse(postData);

  //Find the user with the specified sessionId
  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    //Prepare user with 200 response code
    response.writeHead(200, {"Content-Type": "application/json"});
    //If a user was found
    if(user) {
      //Look for game
      models.GameBoard.findById(request.mGameId, function(err, game) {
        //If a game was found
        if(game) {
          //Return tha state of that game
          gameHandler.getGameState(game, user, function(gameStateResponse){
            response.end(JSON.stringify(gameStateResponse));
          });
        } else {
          //If no game was found return invalid response
          var invalidGameResponse = {
            mStatus: "INVALID_GAME"
          }
          response.end(JSON.stringify(invalidGameResponse));
        }
      });
    } else {
      //If no user was found return invalid credentials
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      }
      response.end(JSON.stringify(invalidResponse));
    }
  });
}


function switchCards(response, postData, db, properties) {

  //Get Request data
  var request = JSON.parse(postData);

  //Find the user with the specified sessionId
  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    //Prepare response with 200 code
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.GameBoard.findById(request.mGameId, function(err, game) {
        if(game) {
          gameHandler.switchCards(game, user, request, function(basicResponse, counter, updatedPlayer ){
            response.end(JSON.stringify(basicResponse));
            if(updatedPlayer) {
              var value = {};
              value["mPlayers." + counter] = updatedPlayer;
              models.GameBoard.update({_id: game._id}, {$set: value}).exec();
            }
            models.GameBoard.findById(game._id, function(err, checkGame) {
              gameHandler.checkSetDoneSwitching(checkGame, function(setDone, currentPlayer, currentPlayerName) {
                console.log(setDone);
                if(setDone) {
                  models.GameBoard.update({_id: game._id}, {$set: mCurrentPlayer: currentPlayer, mCurrentPlayerName: currentPlayerName, mSwitching: false}).exec();
                  var regIds = [];
                  var players = checkGame.mPlayers;
                  //Iterate players
                  for (var i = players.length - 1; i >= 0; i--) {
                    models.User.findById(players[i].mPlayerId, function(err, current) {
                      //Append the regId of the current user to the list of regIds
                      if(current.mUsername != user.mUsername) {
                        regIds.push(current.mRegId);
                      }
                      //When all players are in the array
                      if(regIds.length === players.length - 1) {
                        //Send start event with GCM
                        gcm.sendGCMMessage({mGCMType: "GCM_SWITCHING_DONE", mGameId: checkGame._id}, regIds, properties);
                      }  
                    });
                  };
                }
                //Sublime WAI U MESS UP FORMATTING?!
                //I'm not even gonna comment.. I'm so mad!
              });
});
});
} else { 
  var invalidGameResponse = {
    mStatus: "INVALID_GAME"
  }
  response.end(JSON.stringify(invalidGameResponse));
}
});
} else {
  var invalidResponse = {
    mStatus: "INVALID_CREDENTIALS"
  }
  response.end(JSON.stringify(invalidResponse));
}
});
}

//TODO user cleanup of empty games?
function findGames(response, postData, db, properties) {

  //Get Request data, getting tired of this yet?
  var request = JSON.parse(postData);

  //Find the user with the specified user id
  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    //Prepare response header with code 200
    response.writeHead(200, {"Content-Type": "application/json"});
    //If a user is found
    if(user) {
      //Prepare response
      var activeGamesResponse = {
        mStatus: "OK",
        mGames: []
      };
      var counter = user.mCurrentGames.length;
      //Find all games that the user is in
      models.GameBoard.find({_id: {$in: user.mCurrentGames}}, function(err, games) {
        //Put every game in the response
        for (var i = games.length - 1; i >= 0; i--) {
          activeGamesResponse.mGames.push({mStartedAt: games[i].mStartedAt, mGameId: games[i]._id, mCurrentPlayerName: games[i].mCurrentPlayerName, mLastMove: games[i].mLastUpdate, mRoundLenght: games[i].mRoundLenght});
        };
        //Return response to the user
        response.end(JSON.stringify(activeGamesResponse));
      });
    } else {
      //If the session id does not exist, invalid credentials
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      };
      response.end(JSON.stringify(invalidResponse));
    }
  });
}


function makeMove(response, postData, db, properties) {

  //Get request data
  var request = JSON.parse(postData);

  //Find user by credentials
  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    //Prepare response header
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      //Find the game
      models.GameBoard.findByIdAndUpdate(request.mGameId, {mLocked: true},function(err, game) {
        if(game) {
          //Make the game handler check if move is valid
          gameHandler.checkMove(game, request, user, properties, function(moveResponse, updatedGame, playerIndex){
            //Return the response to the user
            response.end(JSON.stringify(moveResponse));
            //If the game was updated, update it in the database
            if(updatedGame) {
              var value = {};
              value["mPlayers." + playerIndex] = updatedGame.mPlayers[playerIndex];
              models.GameBoard.update({_id: updatedGame._id}, {$set: value, mFinished: updatedGame.mFinished, mCurrentPlayer: updatedGame.mCurrentPlayer, mCurrentPlayerName: updatedGame.mCurrentPlayerName, mDeck: updatedGame.mDeck, mPile: updatedGame.mPile, mLastUpdate: Date.now(), mChanceTaken: updatedGame.mChanceTaken, mLocked: false}).exec();
            }
          });
        } else {
          var invalidGameResponse = {
            mStatus: "INVALID_GAME"
          };
          response.end(JSON.stringify(invalidGameResponse));
        }
      });
} else {
  var invalidResponse = {
    mStatus: "INVALID_CREDENTIALS"
  };
  response.end(JSON.stringify(invalidResponse));
}
});
}

function makeMoveFaceDown(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.GameBoard.findByIdAndUpdate(request.mGameId, {mLocked: true},function(err, game) {
        if(game) {
          gameHandler.checkMoveFaceDown(game, request, user, properties, function(moveResponse, updatedGame, playerIndex){
            response.end(JSON.stringify(moveResponse));

            var value = {};
            value["mPlayers." + playerIndex] = updatedGame.mPlayers[playerIndex];
            models.GameBoard.update({_id: updatedGame._id}, {$set: value, mFinished: updatedGame.mFinished, mCurrentPlayer: updatedGame.mCurrentPlayer, mCurrentPlayerName: updatedGame.mCurrentPlayerName, mDeck: updatedGame.mDeck, mPile: updatedGame.mPile, mLastUpdate: Date.now(), mChanceTaken: updatedGame.mChanceTaken, mLocked: false}).exec();

          });
        } else {
          var invalidGameResponse = {
            mStatus: "INVALID_GAME"
          };
          response.end(JSON.stringify(invalidGameResponse));
        }
      });
    } else {
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      };
      response.end(JSON.stringify(invalidResponse));
    }
  });
}

/***************************************
****************************************
Friend functions
****************************************
****************************************/

function listFriends(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      var friendResponse = {
        mStatus: "OK",
        mFriends: []
      };
      for (var i = user.mFriends.length - 1; i >= 0; i--) {
        friendResponse.mFriends.push(user.mFriends[i]);
      };
      response.end(JSON.stringify(friendResponse));
    } else {
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      };
      response.end(JSON.stringify(invalidResponse));
    }
  });
}

function acceptFriend(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.User.findOne({mUsername: request.mFriendUsername}, function(err, friend){
        if(friend) {
          friendHandler.acceptFriend(user, friend,function(updatedUser, friendResponse){
            response.end(JSON.stringify(friendResponse));
            if(updatedUser) {
              models.User.update({_id: updatedUser._id},{mFriends: updatedUser.mFriends}).exec();
            }
          });
        } else {
          var badFriendResponse = {
            mStatus: "NOT_OK"
          };
          response.end(JSON.stringify(badFriendResponse));
        } 
      });
    } else {
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      };
      response.end(JSON.stringify(invalidResponse));
    }
  });
}

function removeFriend(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.User.findOne({mUsername: request.mFriendUsername}, function(err, friend){
        if(friend) {
          friendHandler.removeFriend(user, friend,function(updatedUser, updatedFriend, friendResponse){
            response.end(JSON.stringify(friendResponse));
            if(updatedUser) {
              models.User.update({_id: updatedUser._id},{mFriends: updatedUser.mFriends}).exec();
            }

            if(updatedFriend) {
              models.User.update({_id: updatedFriend._id},{mFriends: updatedFriend.mFriends}).exec();
            }
          });
        } else {
          var badFriendResponse = {
            mStatus: "NOT_OK"
          };
          response.end(JSON.stringify(badFriendResponse));
        } 
      });
    } else {
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      };
      response.end(JSON.stringify(invalidResponse));
    }
  });
}

function addFriend(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.User.findOne({mUsername: request.mFriendUsername}, function(err, friend){
        if(friend) {
          friendHandler.addFriend(user, friend,function(updatedUser, updatedFriend, friendResponse){
            response.end(JSON.stringify(friendResponse));
            if(updatedUser) {
              models.User.update({_id: updatedUser._id},{mFriends: updatedUser.mFriends}).exec();
            }

            if(updatedFriend) {
              models.User.update({_id: updatedFriend._id},{mFriends: updatedFriend.mFriends}).exec();
            }
          });
        } else {
          var badFriendResponse = {
            mStatus: "NOT_OK"
          };
          response.end(JSON.stringify(badFriendResponse));
        } 
      });
    } else {
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      };
      response.end(JSON.stringify(invalidResponse));
    }
  });
}


//Export all request functions
exports.login = login;
exports.register = register;
exports.findQuickGame = findQuickGame;
exports.findGameInviteFriend = findGameInviteFriend;
exports.getGameState = getGameState;
exports.switchCards = switchCards;
exports.findGames = findGames;
exports.makeMove = makeMove;
exports.makeMoveFaceDown = makeMoveFaceDown;
exports.listFriends = listFriends;
exports.acceptFriend = acceptFriend;
exports.removeFriend = removeFriend;
exports.addFriend = addFriend;

