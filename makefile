all: install

test: install
	touch deployment.properties
	echo 'gcm-key = not-testing-gcm' >> deployment.properties
	echo 'mongo-url = mongodb://localhost:27017/sh_test' >> deployment.properties
	echo 'server-port = 8080' >> deployment.properties
	nodeunit tests/gameHandlerTest.js

install:
	npm install mongodb
	npm install mongoose
	npm install properties-parser
	npm install toolbox
	npm install nodeunit -g
	npm install request
