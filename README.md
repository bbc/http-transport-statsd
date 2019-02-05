# http-transport-statsd

> Metrics can be sent to [StatsD](https://github.com/etsy/statsd/) by providing an instance of the [node-statsd](https://github.com/sivy/node-statsd) client:

The following metrics are sent from each client:

|Name|Type|Description|
|----|----|-----------|
|`{name}.requests`|Counter|Incremented every time a request is made|
|`{name}.responses.{code}`|Counter|Incremented every time a response is received|
|`{name}.request_errors`|Counter|Incremented every time a request fails (timeout, DNS lookup fails etc.)|
|`{name}.response_time`|Timer|Measures of the response time in milliseconds across all requests|
|`{name}.retries`|Counter|Incremented every time the request retries|
|`{name}.attempts`|Timer|Measures the number of attempts|

## Installation

```
npm install --save @bbc/http-transport-statsd
```

## Usage

```js 

const url = 'http://example.com/';
const HttpTransport = require('@bbc/http-transport');
const sendStats = require('@bbc/http-transport-statsd');
const StatsD = require('node-statsd');
const statsD = new StatsD();

const body = await HttpTransport.createClient()
      .use(sendStats(statsd)) // send stats for this request
      .get(url)
      .asBody();
console.log(body);
```

## Test

```
npm test
```

To generate a test coverage report:

```
npm run coverage
```
