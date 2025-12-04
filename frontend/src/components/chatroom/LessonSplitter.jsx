import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@/redux/slices/authSlice";
import { LuSquareSplitHorizontal } from "react-icons/lu";
import { borderColor, chatInputBg, iconColor } from "../../constant";
import { useAddQuickLessonMutation } from "../../redux/api/quickLessonApi";
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import { useConversation } from "@/redux/slices/conversationSlice";

export default function LessonSplitter({ themeIndex }) {
  const [addQuickLesson, { isLoading: isSaving }] = useAddQuickLessonMutation();
  const [splitLesson, setSplitLesson] = useState("");
  const [splitting, setSplitting] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const {conversationId} = useConversation();

  const handleTitleChange = (e) => {
    setLessonTitle(e.target.value);
    setError(""); // Clear error on change
  };

  const handleLessonChange = (e) => {
    setSplitLesson(e.target.value);
    setError(""); // Clear error on change
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!lessonTitle.trim() || !splitLesson.trim()) {
    setError("Both Lesson Title and Lesson Content are required.");
    toast.error("Both Lesson Title and Lesson Content are required.", {
      style: {
        background: chatInputBg[themeIndex],
        color: iconColor[themeIndex],
        border: `1px solid ${borderColor[themeIndex]}`,
      },
    });
    return;
  }

  let lessonTitleAndParts = [
    {
      lessonName: lessonTitle,
      lessonParts: splitLesson.split("//"),
      conversationId: conversationId, // Add conversationId here
    },
  ];

  const formattedData = lessonTitleAndParts.map((item) => ({
    lessonName: item.lessonName,
    lessonParts: item.lessonParts,
    conversationId: conversationId, // Include conversationId directly here
  }));

  setSplitting(true);
  try {
    for (const lesson of formattedData) {
      await addQuickLesson(lesson).unwrap();
    }
    toast.success("Lesson successfully split and saved!", {
      style: {
        background: chatInputBg[themeIndex],
        color: iconColor[themeIndex],
        border: `1px solid ${borderColor[themeIndex]}`,
      },
    });
    setSplitting(false);
    setSplitLesson("");
    setLessonTitle("");
    setError("");
  } catch (error) {
    console.error("Failed to add lesson:", error);
    toast.error("Failed to save lesson. Please try again.", {
      style: {
        background: chatInputBg[themeIndex],
        color: iconColor[themeIndex],
        border: `1px solid ${borderColor[themeIndex]}`,
      },
    });
    setSplitting(false);
  }
};

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        <input
          type="text"
          className={`chatBox ${chatInputBg[themeIndex]} ${iconColor[themeIndex]} h-10 mb-3 rounded-md p-2`}
          value={lessonTitle}
          ref={inputRef}
          onChange={handleTitleChange}
          placeholder="Lesson's title"
        />
        <textarea
          className={`chatBox ${chatInputBg[themeIndex]} ${iconColor[themeIndex]} sm:h-72 h-60 rounded-md p-2 `}
          value={splitLesson}
          onChange={handleLessonChange}
          placeholder="Split your lesson (use // to separate parts)"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <button
          type="submit"
          className={`bg-gradient-to-tl from-[#00a7ffff] to-[#fff20059] text-sm px-4 py-2 rounded-lg text-gray-200 w-fit flex items-center gap-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={splitting || isSaving}
        >
          {splitting
            ? "Splitting..."
            : isSaving
              ? "Saving..."
              : (
                <>
                  Split <LuSquareSplitHorizontal className="text-lg" />
                </>
              )}
        </button>
      </form>
    </>
  );
}