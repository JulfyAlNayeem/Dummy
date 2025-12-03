
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MessageUpdateForm = ({messageId}) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/msg/edit/${messageId}/`);
        setMessage(response.data.message);
      } catch (error) {
        console.error('Error fetching message:', error);
      }
    };

    fetchData();
  }, [messageId]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`http://127.0.0.1:8000/msg/edit/${messageId}/`, { message });
      // Optionally, show a success message or redirect to another page
      console.log('Message updated successfully!');
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  return (
    <div className=' '>
      <h2>Edit Message</h2>
      <form onSubmit={handleUpdate}>
        <label>
          Message:
          <input
            type="text"
            value={message}
            className=' text-black'
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <button className=' bg-green-600' type="submit">Update</button>
      </form>
    </div>
  );
};

export default MessageUpdateForm;

