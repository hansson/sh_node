var models = require('./models');

function acceptFriend(user, friend, callback) {
	var friendIndex = findFriendIndexOnUser(friend, user);
	var userIndex = findFriendIndexOnUser(user, friend);

	if(friendIndex > -1 && userIndex > -1 && user.mFriends[friendIndex].mAccepted == false && friend.mFriends[userIndex].mAccepted == true) {
		var acceptedFriendResponse = {
			mStatus: "OK"
		};
		user.mFriends[friendIndex].mAccepted = true;
		callback(user, acceptedFriendResponse);
	} else {
		var invalidFriendResponse = {
			mStatus: "NOT_OK"
		};
		callback(null, invalidFriendResponse);
	}
}

function removeFriend(user, friend, callback) {
	var friendIndex = findFriendIndexOnUser(friend, user);
	var userIndex = findFriendIndexOnUser(user, friend);

	if(friendIndex > -1 ) {
		var removedFriendResponse = {
			mStatus: "OK"
		};
		user.mFriends.splice(friendIndex , 1);
		if(userIndex > -1) {
			friend.mFriends.splice(userIndex, 1);
			callback(user, friend, removedFriendResponse);	
		} else {
			callback(user, null, removedFriendResponse);	
		}
	} else {
		var invalidFriendResponse = {
			mStatus: "NOT_OK"
		};
		callback(null, null, invalidFriendResponse);
	}
}

function addFriend(user, friend, callback) {
	var friendIndex = findFriendIndexOnUser(friend, user);
	var userIndex = findFriendIndexOnUser(user, friend);

	if(friendIndex == -1) {
		var addFriendResponse = {
			mStatus: "OK"
		};
		user.mFriends.push({mUsername: friend.mUsername, mAccepted: true, mAvatar: friend.mAvatar});
		if(userIndex == -1) {
			friend.mFriends.push({mUsername: user.mUsername, mAccepted: false, mAvatar: user.mAvatar});
		} else {
			friend.mFriends[userIndex] = {mUsername: user.mUsername, mAccepted: true, mAvatar: user.mAvatar};
		}
		callback(user, friend, removedFriendResponse);	
	} else {
		var invalidFriendResponse = {
			mStatus: "NOT_OK"
		};
		callback(null, null, invalidFriendResponse);
	}
}

//Export all friend functions
exports.acceptFriend = acceptFriend;
exports.removeFriend = removeFriend;
exports.addFriend = addFriend;

//Private functions
function findFriendIndexOnUser(friend, user) {
	var index = -1;
	for (var i = user.mFriends.length - 1; i >= 0; i--) {
		if(user.mFriends[i].mUsername == friend.mUsername) {
			index = i;
		}
	};

}