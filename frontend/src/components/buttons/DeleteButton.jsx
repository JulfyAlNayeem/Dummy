import React, { useState } from 'react';

const DeleteButton = ({ messageId }) => {
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDelete = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/msg/delete/${messageId}/`, {
        method: 'DELETE',
        // Add any necessary headers (e.g., authentication token)
      });

      if (response.ok) {
        setIsDeleted(true);
        // Optionally, you can trigger a UI update or show a success message
      } else {
        // Handle error (e.g., show an error message)
        console.error('Error deleting message:', response.statusText);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  };

  return (
    <div>
      {/* {isDeleted ? (
        <p>Message successfully deleted!</p>
      ) : ( */}
        <button onClick={handleDelete}>Delete</button>
      {/* )} */}
    </div>
  );
};

export default DeleteButton;
