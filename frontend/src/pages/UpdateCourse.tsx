
import React, { useState } from 'react';
import axios from 'axios';

interface UpdateCourseFormData {
  id: string;
  teacher_name: string;
  student_name: string;
  course_duration: string;
}

const UpdateCourse = (): JSX.Element => {
  const [formData, setFormData] = useState<UpdateCourseFormData>({
    id: '',
    teacher_name: '',
    student_name: '',
    course_duration: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const url = 'http://127.0.0.1:8000/course/createcourse/';
    
    const method: 'put' | 'post' = formData._id ? 'put' : 'post';

    try {
      const response = await axios({
        method: method,
        url: url,
        data: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(response.data);
      alert(response.data.msg || 'Operation successful');
    } catch (error: any) {
      console.error('There was an error!', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className=" space-y-2 ">
      <div>
        <label>ID (for update only):</label>
        <input
          type="text"
          name="id"
          value={formData._id}
          onChange={handleChange}
        />
      </div>
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
     
      <button type="submit">Submit</button>
    </form>
  );
};

export default UpdateCourse;
