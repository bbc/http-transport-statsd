'use strict';

const nock = require('nock');

const HttpTransport = require('@bbc/http-transport');
const stats = require('../lib/stats');

const host = 'http://www.example.com';
const url = 'http://www.example.com/';
const api = nock(host);
const path = '/';

function toError() {
  return async (ctx, next) => {
    await next();

    if (ctx.res.statusCode >= 400) {
      const err = new Error('something bad happend.');
      err.statusCode = ctx.res.statusCode;
      err.headers = ctx.res.headers;
      throw err;
    }
  };
}

function nockRetries(retry, opts) {
  const httpMethod = opts?.httpMethod || 'get';
  const successCode = opts?.successCode || 200;

  nock.cleanAll();
  api[httpMethod](path).times(retry).reply(500);
  api[httpMethod](path).reply(successCode);
}

function getCallsWith(spy, arg) {
  return spy.mock.calls.filter((call) => call[0] === arg).length;
}

describe('stats', () => {
  let stubbedStats;

  beforeEach(() => {
    stubbedStats = jest.fn();
    stubbedStats.increment = jest.fn();
    stubbedStats.timing = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('increments counter http.requests for each request', async () => {
    api.get('/').reply(200);

    await HttpTransport.createClient()
      .get(url)
      .use(stats(stubbedStats))
      .asBody();

    expect(stubbedStats.increment).toHaveBeenCalledWith('http.requests');
  });

  it('increments counter a request counter with the name of the client if one is provided', async () => {
    api.get('/').reply(200);

    await HttpTransport.createClient()
      .get(url)
      .use(stats(stubbedStats, 'my-client'))
      .asBody();

    expect(stubbedStats.increment).toHaveBeenCalledWith('my-client.requests');
  });

  it('increments a request counter with the name of the client and feed if provided', async () => {
    api.get('/').reply(200);

    await HttpTransport.createClient()
      .get(url)
      .use(stats(stubbedStats, 'my-client', 'feedName'))
      .asBody();

    expect(stubbedStats.increment).toHaveBeenCalledWith('my-client.feedName.requests');
  });

  it('increments counter response for each response', async () => {
    api.get('/').reply(200);

    await HttpTransport.createClient()
      .get(url)
      .use(stats(stubbedStats, 'my-client', 'feedName'))
      .asBody();

    expect(stubbedStats.increment).toHaveBeenCalledWith('my-client.feedName.responses.200');
  });

  it('increments counter for errors', async () => {
    api.get('/').reply(400);

    try {
      await HttpTransport.createClient()
        .use(stats(stubbedStats, 'my-client', 'feedName'))
        .use(toError())
        .get(url)
        .asBody();
    } catch (err) {
      expect(stubbedStats.increment).toHaveBeenCalledWith('my-client.feedName.request_errors');
      expect(stubbedStats.increment).toHaveBeenCalledTimes(1);
      return;
    }
    throw new Error('Expected the request to fail');
  });

  it('increments .retries', async () => {
    const retries = 2;

    nockRetries(retries);
    stubbedStats.increment = jest.fn();

    await HttpTransport.createClient()
      .use(stats(stubbedStats, 'my-client', 'feedName'))
      .use(toError())
      .retry(retries)
      .get(url)
      .asBody();

    const calls = getCallsWith(stubbedStats.increment, 'my-client.feedName.retries');
    expect(calls).toBe(retries);
  });

  it('increments .attempts', async () => {
    const retries = 2;

    nockRetries(retries);
    stubbedStats.timing = jest.fn();

    await HttpTransport.createClient()
      .use(stats(stubbedStats, 'my-client', 'feedName'))
      .use(toError())
      .retry(retries)
      .get(url)
      .asBody();

    expect(stubbedStats.timing).toHaveBeenCalledWith('my-client.feedName.attempts', 1);
    expect(stubbedStats.timing).toHaveBeenCalledWith('my-client.feedName.attempts', 2);
    expect(stubbedStats.timing).toHaveBeenCalledWith('my-client.feedName.attempts', 3);
  });
});
