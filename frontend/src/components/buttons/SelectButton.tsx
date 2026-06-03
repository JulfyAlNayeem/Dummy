import React from "react";

export default function SelectButton({ userMessages, textRef }: any): JSX.Element {

  const handleButtonClick = () => {
    const node = textRef.current; 
    const text = node.textContent;
  
    navigator.clipboard.writeText(text)
      .then((): void => {
      })
      .catch((err: any) => {
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
