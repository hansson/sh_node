var gcm = require('node-gcm');

function sendGCMMessage(data, regIds, properties) {
	var message = new gcm.Message();
	var sender = new gcm.Sender(properties["gcm-key"]);

	// Optional
	message.addData('data',data);

	/**
	 * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
	 */
	sender.send(message, regIds, 4, function (err, result) {
	});
}

exports.sendGCMMessage = sendGCMMessage;
