var gameHandler = require('../gameHandler.js')

exports.testBasic = function(test){
    test.expect(1);
    test.ok(true, "this assertion should pass");
    test.done();
};