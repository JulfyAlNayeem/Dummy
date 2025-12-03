import React, { useState } from "react";
import axios from "axios";

const CourseForm = () => {
  const [formData, setFormData] = useState({
    teacher_name: "",
    student_name: "",
    course_duration: "",
    seat: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/course/createcourse/",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      // console.log("Response:", response.data);
      alert("Course created successfully!");
    } catch (error) {
      // console.error("Error:", error);
      alert("Error creating course");
    }
  };

  return (
    <form onSubmit={handleSubmit} className=" space-y-2 ">
      <div>
        <label>Teacher Name:</label>
        <input
          type="text"
          name="teacher_name"
          value={formData.teacher_name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Student Name:</label>
        <input
          type="text"
          name="student_name"
          value={formData.student_name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Course Duration:</label>
        <input
          type="text"
          name="course_duration"
          value={formData.course_duration}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Seat:</label>
        <input
          type="number"
          name="seat"
          value={formData.seat}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit" className=' bg-green-500 w-32 py-0.5 text-center text-white my-1'>Create Course</button>
    </form>
  );
};

export default CourseForm;


