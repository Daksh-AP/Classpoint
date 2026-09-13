const test = require('firebase-functions-test')();
const admin = require('firebase-admin');

describe('Cloud Functions', () => {
  let myFunctions;

  beforeAll(() => {
    // We would initialize our function module here
    // myFunctions = require('../index.js');
  });

  afterAll(() => {
    test.cleanup();
  });

  it('infrastructure is setup for testing', () => {
    expect(true).toBe(true);
  });
});
