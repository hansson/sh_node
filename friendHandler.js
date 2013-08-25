var models = require('./models');

function removeFriend(user, friend, callback) {
	var friendIndex = findFriendIndexOnUser(friend, user);

	if(friendIndex > -1 ) {
		var removedFriendResponse = {
			mStatus: "OK"
		};
		user.mFriends.splice(friendIndex , 1);
		callback(user, removedFriendResponse);	
	} else {
		var invalidFriendResponse = {
			mStatus: "FRIEND_NOT_EXISTS"
		};
		callback(null, null, invalidFriendResponse);
	}
}

function addFriend(user, friend, callback) {
	var friendIndex = findFriendIndexOnUser(friend.mUsername, user);

	if(friendIndex == -1) {
		var addFriendResponse = {
			mStatus: "OK"
		};
		user.mFriends.push({mUsername: friend.mUsername, mAvatar: friend.mAvatar});
		callback(user, addFriendResponse);	
	} else {
		var invalidFriendResponse = {
			mStatus: "FRIEND_EXISTS"
		};
		callback(null, invalidFriendResponse);
	}
}

//Export all friend functions
exports.removeFriend = removeFriend;
exports.addFriend = addFriend;

//Private functions
function findFriendIndexOnUser(friend, user) {
	var index = -1;
	for (var i = user.mFriends.length - 1; i >= 0; i--) {
		if(user.mFriends[i].mUsername == friend) {
			index = i;
		}
	};
	return index;
}