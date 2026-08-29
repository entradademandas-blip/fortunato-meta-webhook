const log = require('electron-log');

log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.console.level = 'info';
log.transports.file.level = 'info';

module.exports = log;
