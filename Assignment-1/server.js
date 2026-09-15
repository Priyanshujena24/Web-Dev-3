'use strict';

const http = require('http');
const { log } = require('./modules/logger');

const port = Number(process.env.PORT) || 3000;

const routes = {
  '/': 'Welcome to the Smart Utility Toolkit server!',
  '/about': 'About: this server demonstrates Node.js HTTP routing.',
  '/contact': 'Contact: smart-toolkit@example.com',
};

const server = http.createServer((request, response) => {
  const path = new URL(request.url, `http://${request.headers.host}`).pathname;
  log(`${request.method} ${path}`);

  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (request.method !== 'GET') {
    response.writeHead(405);
    response.end('405 Method Not Allowed');
    return;
  }

  if (routes[path]) {
    response.writeHead(200);
    response.end(routes[path]);
    return;
  }

  response.writeHead(404);
  response.end('404 Not Found');
});

server.listen(port, () => log(`Server listening at http://localhost:${port}`));

