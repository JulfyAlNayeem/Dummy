import React, { useState } from 'react'
import MessageUpdateForm from '../forms/MessageUpdateForm';

const EditButton = ({ messageId }) => {
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  return (
    <>
      <button onClick={()=>setShowUpdateForm(true)}>
        Edit
      </button>
      {showUpdateForm? <MessageUpdateForm messageId={messageId}/>:null}
    </>
  )
}

export default EditButton

