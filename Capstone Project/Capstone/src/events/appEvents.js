const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const appEvents = new AppEventEmitter();

// Increase max listeners for high throughput
appEvents.setMaxListeners(50);

module.exports = appEvents;
