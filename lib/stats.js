'use strict';

function createStatsName(statsName, feedName) {
  let name = statsName || 'http';
  if (feedName) {
    name += `.${feedName}`;
  }
  return name;
}

module.exports = (stats, statsName, feedName) => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      stats.increment(`${createStatsName(statsName, feedName)}.request_errors`);
      stats.timing(`${createStatsName(statsName, feedName)}.attempts`, ctx.retryAttempts.length + 1);
      throw err;
    }

    stats.increment(`${createStatsName(statsName, feedName)}.requests`);
    stats.increment(`${createStatsName(statsName, feedName)}.responses.${ctx.res.statusCode}`);
    stats.timing(`${createStatsName(statsName, feedName)}.response_time`, ctx.res.elapsedTime);
    stats.timing(`${createStatsName(statsName, feedName)}.attempts`, ctx.retryAttempts.length + 1);
    ctx.retryAttempts.forEach(() => {
      return stats.increment(`${createStatsName(statsName, feedName)}.retries`);
    });
  };
};
