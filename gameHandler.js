var gcm = require('./gcm-service');
var models = require('./models');

function getGameState(game, user, callback) {

	var gameStateResponse = {
		id: game._id, 
		mCurrentPlayer: game.mCurrentPlayerName,
		mLastUpdate: game.mLastUpdate,
		mRoundLength: game.mRoundLength,
		mStartedAt: game.mStartedAt,
		mSwitching: game.mSwitching,
		mStatus: "OK",
		mPile: game.mPile,
		mDeckSize: game.mDeck.length,
		mFinished: game.mFinished,
		mFaceDown: 0,
		mFaceUp: [],
		mHand: [],
		mPlayerSwitching: false,
		mPosition: 0,
		mOpponents: []
	};

	var opponents = [];
	for (var i = game.mPlayers.length - 1; i >= 0; i--) {
		
		if(user._id == game.mPlayers[i].mPlayerId) {
			gameStateResponse.mFaceDown = game.mPlayers[i].mFaceDown.length;
			gameStateResponse.mFaceUp = game.mPlayers[i].mFaceUp;
			gameStateResponse.mHand = game.mPlayers[i].mHand;
			gameStateResponse.mPlayerSwitching= game.mPlayers[i].mSwitching; 
			gameStateResponse.mPosition = game.mPlayers[i].mPosition;
		} else {
			opponents.push({mFaceDown: game.mPlayers[i].mFaceDown.length, mFaceUp: game.mPlayers[i].mFaceUp, mOnHand: game.mPlayers[i].mHand.length, mUsername: game.mPlayers[i].mUsername, mPosition: game.mPlayers[i].mPosition});
		}
	};
	gameStateResponse.mOpponents = opponents;
	callback(gameStateResponse);
}

function switchCards(game, user, request, callback) {

	var basicResponse = {
		mStatus: "NOT_OK"
	};

	var updatedPlayer = null;

	var search = true;
	var counter = game.mPlayers.length - 1;
	while(search && counter >= 0) {
		if(game.mPlayers[counter].mPlayerId == user._id) {
			search = false;
		} else {
			counter--;
		}
	}

	if(counter == -1) {
		basicResponse.mStatus = "INVALID_GAME";
	} else {
		if(game.mPlayers[counter].mSwitching && request.mHand.length === 3 && request.mFaceUp.length === 3) {
			var missing = false;
			for (var i = game.mPlayers[counter].mHand.length - 1; i >= 0; i--) {
				if(!cardExistsInArray(game.mPlayers[counter].mHand[i],request.mHand) && !cardExistsInArray(game.mPlayers[counter].mHand[i],request.mFaceUp)) {
					missing = true;
					break;
				}
				if(!cardExistsInArray(game.mPlayers[counter].mFaceUp[i],request.mHand) && !cardExistsInArray(game.mPlayers[counter].mFaceUp[i],request.mFaceUp)) {
					missing = true;
					break;
				}
			};

			if(!missing) {
				updatedPlayer = game.mPlayers[counter];
				updatedPlayer.mFaceUp = request.mFaceUp;
				updatedPlayer.mHand = request.mHand;
				updatedPlayer.mSwitching = false;
				basicResponse.mStatus = "OK";
			}

		}
	}
	callback(basicResponse, counter, updatedPlayer);
}

function checkSetDoneSwitching(game, callback) {
	var setDone = true;
	var currentPlayer = null;
	var currentPlayerName = null;
	for (var i = game.mPlayers.length - 1; i >= 0; i--) {
		if(game.mPlayers[i].mSwitching == true) {
			setDone = false;
			break;
		}
	};


	if(setDone) {
		var lowestPlayer = 0;
		var lowestCard = {mValue: 100, mSuit: 4};
		for (var i = game.mPlayers.length - 1; i >= 0; i--) {
			for (var j = game.mPlayers[i].mHand.length - 1; j >= 0; j--) {
				var lowest = isCardLowerThan(game.mPlayers[i].mHand[j], lowestCard);
				if(lowest) {
					lowestPlayer = i;
					lowestCard = game.mPlayers[i].mHand[j];
				}
			};
		};
		currentPlayer = lowestPlayer;
		currentPlayerName = game.mPlayers[currentPlayer].mUsername;
	}

	callback(setDone, currentPlayer, currentPlayerName);
}

function checkMove(game, request, user, properties, callback) {
	var playerIndex = -1;
	for (var i = game.mPlayers.length - 1; i >= 0; i--) {
		if(game.mPlayers[i].mPlayerId == user._id) {
			playerIndex = i;
			break;
		}
	};

	if(playerIndex != -1) {
    if(playerIndex == game.mCurrentPlayer) {
      var player = game.mPlayers[playerIndex];
      var response = {
        mStatus: "OK",
        mNewCards: []
      }
      if(request.mType == "MOVE") {
        var valid = true;
        var value = 0;
        for (var i = request.mCards.length - 1; i >= 0; i--) {
          if((player.mHand.length > 0 && cardExistsInArray(request.mCards[i], player.mHand))||(player.mHand.length == 0 && cardExistsInArray(request.mCards[i], player.mFaceUp))) {
            if(value == 0) {
              value = request.mCards[i].mValue;
            }
            if(value == request.mCards[i].mValue && (request.mCards[i].mValue == 10 || request.mCards[i].mValue == 2 || game.mPile.length == 0 || request.mCards[i].mValue >= game.mPile[game.mPile.length-1].mValue)) {
              valid = true;
            } else {
              valid = false;
              break;
            }
          } else {
            valid = false;
            break;
          }
        };

        if(valid) {
          if(request.mCards[0].mValue == 10) {
            game.mPile.length = 0;
            response.mGameEvent = "EXPLODE";
          } else if(checkFourOfAKind(request.mCards, game.mPile)) {
            game.mPile.length = 0;
            response.mGameEvent = "FOUR";
          } else {
            do {
              game.mCurrentPlayer++;
              if(game.mCurrentPlayer == game.mNumberOfPlayers) {
                game.mCurrentPlayer = 0;
              }
            } while(game.mPlayers[game.mCurrentPlayer].mPosition != 0);
            game.mCurrentPlayerName = game.mPlayers[game.mCurrentPlayer].mUsername;
            response.mGameEvent = "NONE";
            for (var i = request.mCards.length - 1; i >= 0; i--) {
              game.mPile.push(request.mCards[i]);
            };
          }
          response.mNextPlayer = game.mCurrentPlayerName;
          removeCardsFromArrays(request.mCards, player.mHand, player.mFaceUp);
          setNewCards(response, player, game.mDeck);
          game.mChanceTaken = false;
        } else {
          response.mStatus = "NOT_OK";
          callback(response, null, null);
          return;    
        }
      } else if(request.mType == "CHANCE") {
        if(game.mChanceTaken) {
          response.mStatus = "CHANCE_TAKEN";
          callback(response, null, null);
          return;  
        } else if(validateChanceTakePile(player, game.mPile) && game.mDeck.length > 0) {
          response.mNewCards.push(game.mDeck.pop());
          player.mHand.push(response.mNewCards[0]);
          response.setNextPlayer = game.mCurrentPlayerName;
          game.mChanceTaken = true;
        } else {
          response.mStatus = "NOT_OK";
          callback(response, null, null);
          return;     
        }
      } else if(request.mType == "PILE") {
        if(validateChanceTakePile(player, game.mPile)) {
          var newCards = game.mPile;
          for (var i = newCards.length - 1; i >= 0; i--) {
            player.mHand.push(newCards[i]);
          };
          response.mNewCards = newCards;
          game.mPile = [];
          do {
            game.mCurrentPlayer++;
            if(game.mCurrentPlayer == game.mNumberOfPlayers) {
              game.mCurrentPlayer = 0;
            }
          } while(game.mPlayers[game.mCurrentPlayer].mPosition != 0);
          game.mCurrentPlayerName = game.mPlayers[game.mCurrentPlayer].mUsername;
          response.mNextPlayer = game.mCurrentPlayerName;
          response.mGameEvent = "PILE";
          game.mmChanceTaken = false;
        } else {
          response.mStatus = "NOT_OK";
          callback(response, null, null);
          return;
        }
      }
      if(player.mFaceDown.length == 0 && player.mFaceUp.length == 0 && player.mHand.length == 0) {
        decideFinishPosition(player, game);
      }

      callback(response, game, playerIndex);
      //Send GCM
      var regIds = [];
      var players = game.mPlayers;
      //Iterate players
      for (var i = players.length - 1; i >= 0; i--) {
        models.User.findById(players[i].mPlayerId, function(err, current) {
          //Append the regId of the current user to the list of regIds
          if(current.mUsername != player.mUsername) {
            regIds.push(current.mRegId);
          }
          //When all players are in the array
          if(regIds.length === players.length - 1) {
            //Send start event with GCM
            gcm.sendGCMMessage({mGCMType: "GCM_PLAYER_MOVE", mGameId: game._id, mNextPlayer: game.mCurrentPlayerName, mPlayerMove: request.mCards, mFaceUpCards: player.mFaceUp, mHandCards: player.mHand.length}, regIds, properties);          }  
          });
      };

    } else {
      var response = {
        mStatus: "OTHER_PLAYER"
      }
      callback(response, null, null);        
    }
  } else {
    var response = {
      mStatus: "INVALID_GAME"
    }
    callback(response, null, null);  
  }
}

function checkMoveFaceDown(game, request, user, properties, callback) {
  var playerIndex = -1;
  for (var i = game.mPlayers.length - 1; i >= 0; i--) {
    if(game.mPlayers[i].mPlayerId == user._id) {
      playerIndex = i;
      break;
    }
  };

  if(playerIndex != -1) {
    if(playerIndex == game.mCurrentPlayer) {
      var player = game.mPlayers[playerIndex];
      var response = {
        mStatus: "OK"
      }
      if(player.mHand.length == 0 && player.mFaceUp.length == 0 && player.mFaceDown.length != 0) {
        var index = request.mIndex;
        if(index < 0 ) {
          index = 0;
        }
        if(index > player.mFaceDown.length) {
          index = player.mFaceDown.length - 1;
        }

        var card = [];
        card.push(player.mFaceDown.splice(index, 1));
        if(card[0].mValue == 10) {
          mGame.mPile.length = 0;
          response.mGameEvent = "EXPLODE";
        } else if(checkFourOfAKind(card, game.mPile)) {
          mGame.mPile.length = 0;
          response.mGameEvent = "FOUR";
        } else if(card[0].mValue == 2 || game.mPile.length == 0 || card[0].mValue >= game.mPile[game.mPile.length - 1]){
          do {
            game.mCurrentPlayer++;
            if(game.mCurrentPlayer == game.mNumberOfPlayers) {
              game.mCurrentPlayer = 0;
            }
          } while(game.mPlayers[game.mCurrentPlayer].mPosition != 0);
          game.mCurrentPlayerName = game.mPlayers[game.mCurrentPlayer].mUsername;
          response.mGameEvent = "NONE";
          game.mPile.push(card[0]);
        } else {
          response.mNewCards = [];
          transferToArray(game.mPile, response.mNewCards);
          response.mNewCards[response.mNewCards.length] = card[0];
          player.mHand = response.mNewCards.slice(0);
          do {
            game.mCurrentPlayer++;
            if(game.mCurrentPlayer == game.mNumberOfPlayers) {
              game.mCurrentPlayer = 0;
            }
          } while(game.mPlayers[game.mCurrentPlayer].mPosition != 0);
          mCurrentPlayerName = mPlayers.get(mCurrentPlayer).getUsername();
          response.mGameEvent = "PILE";
        }
        response.mNextPlayer = game.mCurrentPlayerName;
        game.mChanceTaken = false;
        if(player.mFaceDown.length == 0 && player.mFaceUp.length == 0 && player.mHand.length == 0) {
          decideFinishPosition(player, game);
        }

        callback(response, game, playerIndex);
        //Send GCM
        var regIds = [];
        var players = game.mPlayers;
        //Iterate players
        for (var i = players.length - 1; i >= 0; i--) {
          models.User.findById(players[i].mPlayerId, function(err, current) {
            //Append the regId of the current user to the list of regIds
            if(current.mUsername != player.mUsername) {
              regIds.push(current.mRegId);
            }
            //When all players are in the array
            if(regIds.length === players.length - 1) {
              //Send start event with GCM
              gcm.sendGCMMessage({mGCMType: "GCM_PLAYER_MOVE_FACE_DOWN", mGameId: game._id, mNextPlayer: game.mCurrentPlayerName, mFaceDownCard: card, mGameEvent: response.mGameEvent}, regIds, properties);
            }  
          });
        };
      }
    } else {
      response.mStatus = "OTHER_PLAYER";
      callback(response, null, null);        
    }
  } else {
    response.mStatus = "INVALID_GAME";
    callback(response, null, null);  
  }
}

exports.getGameState = getGameState;
exports.switchCards = switchCards;
exports.checkSetDoneSwitching = checkSetDoneSwitching;
exports.checkMove = checkMove;
exports.checkMoveFaceDown = checkMoveFaceDown;

//PRIVATE FUNCTIONS

function transferToArray(from, to) {
  for (var i = from.length - 1; i >= 0; i--) {
    to[i] = from.pop();
  };

}

function decideFinishPosition(player, game) {
  var highestPos = 0;
  for (var i = game.mPlayers.length - 1; i >= 0; i--) {
    if(game.mPlayers[i].mPosition > highestPos) {
      highestPos = game.mPlayers[i].mPosition;
    }
  };
  player.mPosition = highestPos +1;
  if(player.mPosition == 3) {
    game.mFinished = true;
  }
}

function checkFourOfAKind(cards, pile) {
  if(cards.length == 4) {
    return true;
  }
  var count = cards.length;
  for (var i = pile.length - 1; i >= 0; i--) {
    if(pile[i].mValue != cards[0].mValue) {
      break;
    } else {
      count++;
    }
  };
  return (count == 4);

}

function removeCardsFromArrays(cards, hand, faceUp) {
  for (var i = cards.length - 1; i >= 0; i--) {
    for (var j = hand.length - 1; j >= 0; j--) {
      if(hand[j].mValue == cards[i].mValue && hand[j].mSuit == cards[i].mSuit) {
        hand.splice(j, 1);
        break;
      }
    };

    for (var j = faceUp.length - 1; j >= 0; j--) {
      if(faceUp[j].mValue == cards[i].mValue && faceUp[j].mSuit == cards[i].mSuit) {
        faceUp.splice(j, 1);
        break;
      }
    };
  };

}

function setNewCards(response, player, deck) {
  response.mNewCards = [];
  if(deck.length > 0) {
    for (var i = 3 - player.mHand.length; i > 0 ; i--) {
      var newCard = deck.pop();
      if(newCards != null) {
        response.mNewCards.push();
      }
    };

    for (var i = response.mNewCards.length - 1; i >= 0; i--) {
      player.mHand.push(response.mNewCards[i]);
    };
  }
}

function isCardLowerThan(card, than) {
	var lower = false;

	if(card.mValue != 2 || card.mValue != 10) {
		if(card.mValue < than.mValue) {
			lower = true;
		} else if (card.mValue == than.mValue && card.mSuit < than.mSuit){
			lower = true;
		}
	}

	return lower;
}

function cardExistsInArray(object, array) {
	var contains = false;
  if(object != null && array != null) {
    for (var i = array.length - 1; i >= 0; i--) {
      if(object.mValue == array[i].mValue && object.mSuit == array[i].mSuit) {
        contains = true;
        break;
      }
    };
  }
  return contains;
}

function validateChanceTakePile(player, pile) {
  var valid = true;
  if (pile.length == 0) {
    valid = false;
  } else if (player.mHand.length > 0) {
    for (var i = player.mHand.length - 1; i >= 0; i--) {
      if (player.mHand[i].mValue == 2 || player.mHand[i].mValue == 10 || player.mHand[i].mValue >= pile[pile.length -1].mValue) {
        valid = false;
        break;
      }
    };
    for (var i = player.mHand.length - 1; i >= 0; i--) {
      if (player.mHand[i].mValue == 2 || player.mHand[i].mValue == 10 || player.mHand[i].mValue >= pile[pile.length -1].mValue) {
        valid = false;
        break;
      }
    };
  } else if (player.mFaceUp.length > 0) {
    for (var i = player.mFaceUp.length - 1; i >= 0; i--) {
      if (player.mFaceUp[i].mValue == 2 || player.mFaceUp[i].mValue == 10 || player.mFaceUp[i].mValue >= pile[pile.length -1].mValue) {
        valid = false;
        break;
      }
    };
  } else {
    valid = false;
  }
  return valid;
}



