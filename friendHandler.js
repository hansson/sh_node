var models = require('./models');

function acceptFriend(user, friend, callback) {
	var friendIndex = findFriendIndexOnUser(friend, user);
	var userIndex = findFriendIndexOnUser(user, friend);

	if(friendIndex > -1 && userIndex > -1 && user.mFriends[friendIndex].mAccepted == false && friend.mFriends[userIndex].mAccepted == true) {
		var acceptedFriendResponse {
			mStatus: "OK"
		};
		user.mFriends[friendIndex].mAccepted = true;
		callback(user, acceptedFriendResponse);
	} else {
		var invalidFriendResponse {
			mStatus: "NOT_OK"
		};
		callback(null, invalidFriendResponse);
	}
}

//Export all friend functions
exports.acceptFriend = acceptFriend;

//Private functions
function findFriendIndexOnUser(friend, user) {
	var index = -1;
	for (var i = user.mFriends.length - 1; i >= 0; i--) {
		if(user.mFriends[i].mUsername == friend.mUsername) {
			index = i;
		}
	};

}