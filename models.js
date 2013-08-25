var mongoose = require('mongoose');

/**
*	Schema and model creation
*	All entitys should be defined here
*/

//GameBoards
var gameBoardSchema = mongoose.Schema({
  mCurrentPlayer: Number,
  mCurrentPlayerName: String,
  mStarted: Boolean,
  mSwitching: Boolean,
  mFinished: Boolean,
  mPlayers: [{mPlayerId: String, mUsername: String, mHand: [{mValue: Number, mSuit: Number}], mFaceDown: [{mValue: Number, mSuit: Number}], mFaceUp: [{mValue: Number, mSuit: Number}], mPosition: Number, mSwitching: Boolean, mAccepted: Boolean}],
  mDeck: [{mValue: Number, mSuit: Number}],
  mPile: [{mValue: Number, mSuit: Number}],
  mStartedAt: {type: Date},
  mLastUpdate: {type: Date},
  mChanceTaken: Boolean,
  mRoundLength: Number,
  mNumberOfPlayers: Number,
  mPrivateGame: Boolean,
  mLocked: Boolean
});
var GameBoard = mongoose.model('gameBoard', gameBoardSchema);

//Users
var userSchema = mongoose.Schema({
  mEmail: String,
  mSessionId: String,
  mUsername: String,
  mPassword: String,
  mActive: Boolean,
  mCreated: {type: Date},
  mRegId: String,
  mFriends: [{mUsername: String, mAvatar: String}],
  mCurrentGames: [String],
  mFinishedGames: [String],
  mMatches: Number,
  mWon: Number,
  mLocked: Boolean,
  mAvatar: String
});
userSchema.set('toObject', { getters: true, virtuals: false });
var User = mongoose.model('user', userSchema);

exports.User = User;
exports.GameBoard = GameBoard;