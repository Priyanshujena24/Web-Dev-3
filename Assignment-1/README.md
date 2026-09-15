# Smart Utility Toolkit

A package-free Node.js lab assignment demonstrating command-line input, custom modules, HTTP routing, asynchronous file operations, and secure randomness. It uses only Node.js core modules.

## Requirements

- Node.js 18 or later
- No `npm install` is needed

## Run the utilities

```bash
# CLI calculator
node calculator.js add 10 5
node calculator.js divide 12 3

# Custom module demonstration
node app.js 11

# HTTP server (visit /, /about, /contact, or an invalid route)
node server.js

# File manager: action, optional filename, optional text
node fileManager.js create notes.txt "First line"
node fileManager.js read notes.txt
node fileManager.js update notes.txt "Second line"
node fileManager.js delete notes.txt

# Secure crypto dice rolls
node dice.js 3
```

Set a custom server port with `PORT=4000 node server.js` (PowerShell: `$env:PORT=4000; node server.js`).

## Project structure

```text
smart-utility-toolkit/
├── calculator.js      # process.argv calculator
├── app.js             # reuses custom modules
├── server.js          # http server and routes
├── fileManager.js     # fs CRUD operations
├── dice.js            # crypto dice simulator
├── test.txt
└── modules/
    ├── isEven.js
    └── logger.js
```

`fileManager.js` deliberately uses callback-based asynchronous `fs` methods. Its "scheduled" log appears before the operation's success/failure callback, making execution order observable.
