var exec = require("child_process").exec;
var fs = require('fs');
var models = require('./models')
var gameHandler = require('./gameHandler')
var gcm = require('./gcm-service')

/***************************************
****************************************
Authentication functions
****************************************
****************************************/

/*
{"mUsername":"linne", "mPassword":"a790b758148da5df3809610308ee0478d68c572b029e12aa5a02bfda70d4e716"}
*/

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

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      var basicResponse = {
        mStatus: "OK"
      }
      response.end(JSON.stringify(basicResponse));
      var player = {
        mPlayerId: user._id,
        mUsername: user.mUsername
      }
      fs.writeFile("./queue/" + Date.now() + ".queue", JSON.stringify(player));
    } else {
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      }
      response.end(JSON.stringify(invalidResponse));
    }
  });
}


function getGameState(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.GameBoard.findById(request.mGameId, function(err, game) {
        if(game) {
          gameHandler.getGameState(game, user, function(gameStateResponse){
            response.end(JSON.stringify(gameStateResponse));
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


function switchCards(response, postData, db, properties) {

  var request = JSON.parse(postData);


  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
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
                if(setDone) {
                  models.GameBoard.update({_id: game._id}, {$set: {mCurrentPlayer: currentPlayer}, $set: {mCurrentPlayerName: currentPlayerName}, $set: {mSwitching: false}}).exec();
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

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      var activeGamesResponse = {
        mStatus: "OK",
        mGames: []
      };
      var counter = user.mCurrentGames.length;
      models.GameBoard.find({_id: {$in: user.mCurrentGames}}, function(err, games) {
        for (var i = games.length - 1; i >= 0; i--) {
          activeGamesResponse.mGames.push({mStartedAt: games[i].mStartedAt, mGameId: games[i]._id, mCurrentPlayerName: games[i].mCurrentPlayerName, mLastMove: games[i].mLastUpdate});
        };
        response.end(JSON.stringify(activeGamesResponse));
      });
    } else {
      var invalidResponse = {
        mStatus: "INVALID_CREDENTIALS"
      }
      response.end(JSON.stringify(invalidResponse));
    }
  });
}


function makeMove(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.GameBoard.findByIdAndUpdate(request.mGameId, {mLocked: true},function(err, game) {
        if(game) {
          gameHandler.checkMove(game, request, user, function(moveResponse, updatedGame, playerIndex){
            response.end(JSON.stringify(moveResponse));
            if(updatedGame && playerIndex) {
              var value = {};
              value["mPlayers." + playerIndex] = updatedGame.mPlayers[playerIndex];
              models.GameBoard.update({_id: updatedGame._id}, {$set: value, mFinished: updatedGame.mFinished, mCurrentPlayer: updatedGame.mCurrentPlayer, mCurrentPlayerName: updatedGame.mCurrentPlayerName, mDeck: updatedGame.mDeck, mPile: updatedGame.mPile, mLastUpdate: Date.now(), mChanceTaken: updatedGame.mChanceTaken, mLocked: false}).exec();
            }
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

function makeMoveFaceDown(response, postData, db, properties) {

  var request = JSON.parse(postData);

  models.User.findOne({mSessionId: request.mSessionId}, function (err, user) {
    if (err); // TODO handle err
    response.writeHead(200, {"Content-Type": "application/json"});
    if(user) {
      models.GameBoard.findByIdAndUpdate(request.mGameId, {mLocked: true},function(err, game) {
        if(game) {
          gameHandler.checkMoveFaceDown(game, request, user, function(moveResponse, updatedGame, playerIndex){
            response.end(JSON.stringify(moveResponse));

            var value = {};
            value["mPlayers." + playerIndex] = updatedGame.mPlayers[playerIndex];
            models.GameBoard.update({_id: updatedGame._id}, {$set: value, mFinished: updatedGame.mFinished, mCurrentPlayer: updatedGame.mCurrentPlayer, mCurrentPlayerName: updatedGame.mCurrentPlayerName, mDeck: updatedGame.mDeck, mPile: updatedGame.mPile, mLastUpdate: Date.now(), mChanceTaken: updatedGame.mChanceTaken, mLocked: false}).exec();

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



exports.login = login;
exports.register = register;
exports.findQuickGame = findQuickGame;
exports.getGameState = getGameState;
exports.switchCards = switchCards;
exports.findGames = findGames;
exports.makeMove = makeMove;
exports.makeMoveFaceDown = makeMoveFaceDown;


