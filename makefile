all: install

test: install

install:
	npm install mongodb
	npm install mongoose
	npm install node-gcm
	npm install properties-parser
	npm install sleep
	npm install toolbox
