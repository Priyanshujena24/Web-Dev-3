# Student Management REST API

A simple in-memory Student Management REST API built with Node.js and Express for an in-class lab.

## Features

- Uses an array of JSON objects only - no database or Mongoose.
- Organizes student endpoints with modular routing.
- Logs every request with custom middleware.
- Returns appropriate `200`, `201`, `400`, and `404` status codes.
- Supports create, read, update, and delete operations.

## Project Structure

```text
student-management-rest-api/
|-- app.js
|-- package.json
|-- data/
|   `-- students.js
|-- middleware/
|   `-- logger.js
`-- routes/
    `-- studentRoutes.js
```

## Install and Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open `http://localhost:3000` in Postman. The server restarts with empty sample data whenever it is stopped and started again.

For automatic restart while developing:

```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/students` | Get all students |
| GET | `/students/:id` | Get one student by ID |
| POST | `/students` | Add a student |
| PUT | `/students/:id` | Update a student |
| DELETE | `/students/:id` | Delete a student |

## Postman Test Examples

### Get all students

**GET** `http://localhost:3000/students`

### Get one student

**GET** `http://localhost:3000/students/1`

### Add a student

**POST** `http://localhost:3000/students`

Set the Postman body to **raw** and **JSON**:

```json
{
  "name": "Rahul Verma",
  "email": "rahul@example.com",
  "course": "Express.js"
}
```

Expected status: `201 Created`

### Update a student

**PUT** `http://localhost:3000/students/1`

Set the Postman body to **raw** and **JSON**:

```json
{
  "name": "Aarav Sharma",
  "email": "aarav.sharma@example.com",
  "course": "Advanced Node.js"
}
```

Expected status: `200 OK`

### Delete a student

**DELETE** `http://localhost:3000/students/2`

Expected status: `200 OK`

## Error Examples

- Send a POST or PUT request without `name`, `email`, or `course` to receive `400 Bad Request`.
- Request an ID that does not exist, such as `GET /students/999`, to receive `404 Not Found`.
- Request an unknown URL, such as `GET /unknown`, to receive `404 Not Found`.
