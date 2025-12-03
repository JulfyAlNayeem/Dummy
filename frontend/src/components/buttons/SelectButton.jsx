import React from "react";

export default function SelectButton({ userMessages, textRef }) {

  const handleButtonClick = () => {
    const node = textRef.current; 
    const text = node.textContent;
  
    navigator.clipboard.writeText(text)
      .then(() => {
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  };
  
  return (
    <>
      <button
        onClick={handleButtonClick}
      >
        Copy
      </button>
    </>
  );
}
