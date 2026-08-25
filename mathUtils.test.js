const assert = require("assert");
const { add, multiply } = require("./mathUtils");

assert.strictEqual(add(2, 3), 5);
console.log("add: ok");

assert.strictEqual(multiply(2, 3), 6);
console.log("multiply: ok");
