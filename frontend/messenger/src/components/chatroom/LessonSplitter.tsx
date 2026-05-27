import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@/redux/slices/authSlice";
import { LucideSquareSplitHorizontal } from "lucide-react";
import { themeChatInput, themeIcon, themeBorder } from "@/lib/themeUtils";
import { useAddQuickLessonMutation } from "../../redux/api/quickLessonApi";
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import { useConversation } from "@/redux/slices/conversationSlice";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";


export default function LessonSplitter({ themeIndex }: { themeIndex?: number }): JSX.Element {
    const [addQuickLesson, { isLoading: isSaving }]: any = useAddQuickLessonMutation();
    const [splitLesson, setSplitLesson] = useState<string>('');
    const [splitting, setSplitting] = useState<boolean>(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const {conversationId} = useConversation();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setLessonTitle(e.target.value);
    setError(""); // Clear error on change
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (textarea: HTMLTextAreaElement | null): void => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleLessonChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setSplitLesson(e.target.value);
    setError(""); // Clear error on change
    autoResize(e.target);
  };

const handleSubmit = async (e: React.FormEvent): Promise<void> => {
  e.preventDefault();
  if (!lessonTitle.trim() || !splitLesson.trim()) {
    setError("Both Lesson Title and Lesson Content are required.");
    toast.error("Both Lesson Title and Lesson Content are required.", {
      style: {
        background: themeChatInput(themeIndex),
        color: themeIcon(themeIndex),
        border: `1px solid ${themeBorder(themeIndex)}`,
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
    if (!conversationId || conversationId === 'new') {
      toast.error("Cannot save lesson: no active conversation.");
      setSplitting(false);
      return;
    }
    for (const lesson of formattedData) {
      await addQuickLesson(lesson).unwrap();
    }
    toast.success("Lesson successfully split and saved!", {
      style: {
        background: themeChatInput(themeIndex),
        color: themeIcon(themeIndex),
        border: `1px solid ${themeBorder(themeIndex)}`,
      },
    });
    setSplitting(false);
    setSplitLesson("");
    setLessonTitle("");
    setError("");
  } catch (error: any) {
    console.error("Failed to add lesson:", error);
    toast.error("Failed to save lesson. Please try again.", {
      style: {
        background: themeChatInput(themeIndex),
        color: themeIcon(themeIndex),
        border: `1px solid ${themeBorder(themeIndex)}`,
      },
    });
    setSplitting(false);
  }
};

  useEffect(() => {
    inputRef.current.focus();
    if (textareaRef.current) {
      autoResize(textareaRef.current);
    }
  }, [textareaRef]);

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        <Input
          type="text"
          className={themeChatInput(themeIndex, themeIcon(themeIndex), "chatBox h-10 mb-3 rounded-md p-2")}
          value={lessonTitle}
          ref={inputRef}
          onChange={handleTitleChange}
          placeholder="Lesson's title"
        />
        <Textarea
          ref={textareaRef}
          className={cn(themeChatInput(themeIndex), themeIcon(themeIndex), "chatBox overflow-hidden resize-none rounded-md p-2")}
          value={splitLesson}
          onChange={handleLessonChange}
          onInput={(e) => autoResize(e.target)}
          placeholder="Split your lesson (use // to separate parts)"
          style={{ height: 'auto' }}
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <Button
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
                  Split <LucideSquareSplitHorizontal className="text-lg" />
                </>
              )}
        </Button>
      </form>
    </>
  );
}