function route(handle, pathname, response, postData,db, mongoose, properties) {
	if (typeof handle[pathname] === 'function') {
		try {
			handle[pathname](response, postData, db, mongoose, properties);	
		} catch(e) {
			response.writeHead(500, {"Content-Type": "text/plain"});
			response.write("500 Internal Server Error");
			response.end();
			console.error("######################");
			console.error("Pathname: " + pathname);
			console.error("PostData: " + postData);
			console.error(e.stack);
			console.error("######################");
		}
		
	} else {
		response.writeHead(404, {"Content-Type": "text/plain"});
		response.write("404 Not found");
		response.end();
	}
}

exports.route = route;