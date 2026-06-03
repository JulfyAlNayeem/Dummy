import React, { useState } from 'react'
import MessageUpdateForm from '../forms/MessageUpdateForm';

const EditButton = ({ messageId }: { messageId: string }): JSX.Element => {
  const [showUpdateForm, setShowUpdateForm] = useState<boolean>(false);
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

