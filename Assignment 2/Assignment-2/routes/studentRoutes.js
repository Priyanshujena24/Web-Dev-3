const express = require("express");
const students = require("../data/students");

const router = express.Router();

function findStudent(id) {
  return students.find((student) => student.id === Number(id));
}

function isValidStudent(name, email, course) {
  return name && email && course;
}

router.get("/", (req, res) => {
  res.status(200).json(students);
});

router.get("/:id", (req, res) => {
  const student = findStudent(req.params.id);

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  res.status(200).json(student);
});

router.post("/", (req, res) => {
  const { name, email, course } = req.body;

  if (!isValidStudent(name, email, course)) {
    return res.status(400).json({
      message: "Name, email, and course are required"
    });
  }

  const newStudent = {
    id: students.length ? Math.max(...students.map((student) => student.id)) + 1 : 1,
    name,
    email,
    course
  };

  students.push(newStudent);
  res.status(201).json(newStudent);
});

router.put("/:id", (req, res) => {
  const student = findStudent(req.params.id);

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const { name, email, course } = req.body;

  if (!isValidStudent(name, email, course)) {
    return res.status(400).json({
      message: "Name, email, and course are required"
    });
  }

  student.name = name;
  student.email = email;
  student.course = course;

  res.status(200).json(student);
});

router.delete("/:id", (req, res) => {
  const studentIndex = students.findIndex(
    (student) => student.id === Number(req.params.id)
  );

  if (studentIndex === -1) {
    return res.status(404).json({ message: "Student not found" });
  }

  const deletedStudent = students.splice(studentIndex, 1)[0];
  res.status(200).json({
    message: "Student deleted successfully",
    student: deletedStudent
  });
});

module.exports = router;
