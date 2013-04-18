var http = require("http");
var url = require("url");

function start(route, handle, db, properties) {
	function onRequest(request, response) {
		var postData = "";
		var pathname = url.parse(request.url).pathname;

		request.setEncoding("utf8");

		request.addListener("data",  function(postDataChunk) {
			postData += postDataChunk;
		});

		request.addListener("end", function() {
			route(handle, pathname, response, postData, db, properties);
		});
		
	}

	http.createServer(onRequest).listen(properties["server-port"]);
	console.log("Server has started.");
}

exports.start = start;
