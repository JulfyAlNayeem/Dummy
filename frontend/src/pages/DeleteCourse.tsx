import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Course {
  id: number;
  student_name: string;
}

const CourseList = (): JSX.Element => {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    // Fetch the list of courses from the API
    axios.get('http://127.0.0.1:8000/course/')
      .then(response => {
        setCourses(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the courses!', error);
      });
  }, []);

  const handleDelete = (courseId: number): void => {
    axios.delete(`http://127.0.0.1:8000/course/delete/${courseId}/`)
      .then(response => {
        console.log(response.data.msg);
        setCourses(prevCourses => prevCourses.filter(course => course._id !== courseId));
      })
      .catch((error: any) => {
        console.error('There was an error deleting the course!', error);
      });
  };
console.log(courses)
  return (
    <div>
      <h1>Course List</h1>
      <ul>
      {courses.map((course, index) => (
  <li key={index} className='center gap-2'>
    <p className=' bg-green-500 w-16 text-center text-white my-1'>{course.student_name}</p>
    <button onClick={() => handleDelete(index+1)} className=' bg-red-500 w-16 text-center text-white my-1'>Delete</button>
  </li>        
))}

      </ul>
    </div>
  );
};

export default CourseList;
