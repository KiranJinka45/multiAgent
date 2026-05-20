module.exports = {
  rules: {
    'no-websocket-imports': require('./rules/no-websocket-imports'),
    'no-plugin-loader': require('./rules/no-plugin-loader'),
    'no-optimistic-state': require('./rules/no-optimistic-state'),
    'no-unbounded-intervals': require('./rules/no-unbounded-intervals'),
    'no-animation-flash': require('./rules/no-animation-flash'),
    'no-audio-alerts': require('./rules/no-audio-alerts'),
    'no-mobile-mutation': require('./rules/no-mobile-mutation')
  }
};
