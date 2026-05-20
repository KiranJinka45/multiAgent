module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban full-duplex WebSocket libraries to enforce HTTP polling architecture freeze.',
      category: 'Architecture Freeze',
      recommended: true,
    },
    messages: {
      noWebSockets: 'WebSockets are strictly prohibited by ZTAN Governance Blueprint 10.2. Use HTTP polling or SSE instead.',
    },
    schema: [],
  },
  create: function(context) {
    const bannedModules = ['socket.io', 'ws', 'socket.io-client', 'rxjs/webSocket'];

    return {
      ImportDeclaration(node) {
        if (bannedModules.includes(node.source.value)) {
          context.report({
            node,
            messageId: 'noWebSockets',
          });
        }
      },
      CallExpression(node) {
        // Catch dynamic imports or require()
        if (node.callee.name === 'require' && node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
          if (bannedModules.includes(node.arguments[0].value)) {
            context.report({
              node,
              messageId: 'noWebSockets',
            });
          }
        }
        // Catch raw browser WebSocket usage
        if (node.callee.name === 'WebSocket') {
          context.report({
            node,
            messageId: 'noWebSockets',
          });
        }
        if (node.callee.type === 'Identifier' && node.callee.name === 'WebSocket') {
           context.report({
            node,
            messageId: 'noWebSockets',
          });
        }
      },
      NewExpression(node) {
        if (node.callee.name === 'WebSocket') {
           context.report({
            node,
            messageId: 'noWebSockets',
          });
        }
      }
    };
  }
};
