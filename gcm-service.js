var gcm = require('node-gcm');
var request = require('request');

function sendGCMMessage(data, regIds, properties) {
	//var message = new gcm.Message();
	//var sender = new gcm.Sender(properties["gcm-key"]);

	// Optional
	//message.addData('data',data);
	//console.log(data);
	//console.log("---------");

	/**
	 * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
	 */
	 //sender.send(message, regIds, 4, function (err, result) {
	 //	console.log(err);
	 //	console.log("---------");
	 //	console.log(result);
	 //});

	 request(
	 	{
		 	method: 'POST',
		 	uri:'https://android.googleapis.com/gcm/send',
		 	headers: {'authorization': 'key=' + properties["gcm-key"]},
		 	json: 
		 		{ 
		 			registration_ids: regIds,
		 			data: {data: data}
		 		} 
		},
	 	function (error, response, body) {
	 	}
	);
}

	exports.sendGCMMessage = sendGCMMessage;
