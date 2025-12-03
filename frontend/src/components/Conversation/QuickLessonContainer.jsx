import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { accordionDetails, accordionSummaryOne, accordionSummaryTwo, iconColor } from "../../constant";
import {
  useFetchQuickLessonsQuery,
  useEditQuickLessonMutation,
  useDeleteQuickLessonMutation,
} from "../../redux/api/quickLessonApi";
import { useUserAuth } from "../../context-reducer/UserAuthContext";
import { useSelector, useDispatch } from "react-redux";
import { addMessage, setConversationId, useConversation } from "../../redux/slices/conversationSlice";
import { useState } from "react";
import { BsSendFill } from "react-icons/bs";
import { useSendMessageMutation } from "@/redux/api/messageApi";
import { createTextMessage } from "@/lib/optimisticMessageFormat";
import { sendTextMessageUsingSocket } from "../buttons/EmojiContainer";

export default function QuickLesson({ setVisible }) {
  const conversationId = useSelector((state) => state.conversation.conversationId);
  const { data: quickLessons = [], refetch, isFetching, isError } = useFetchQuickLessonsQuery(conversationId, { skip: !conversationId });
  const [editQuickLesson] = useEditQuickLessonMutation();
  const [deleteQuickLesson] = useDeleteQuickLessonMutation();
  const [sendMessage] = useSendMessageMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [editLessonName, setEditLessonName] = useState("");


  const [editPartOpen, setEditPartOpen] = useState(false);
  const [editPartValue, setEditPartValue] = useState("");
  const [editPartIdx, setEditPartIdx] = useState(null);
  const [editPartLesson, setEditPartLesson] = useState(null);

  const [deletePartOpen, setDeletePartOpen] = useState(false);
  const [deletePartIdx, setDeletePartIdx] = useState(null);
  const [deletePartLesson, setDeletePartLesson] = useState(null);

  const dispatch = useDispatch();
  const { user, socket } = useUserAuth();
  const receiver = useSelector((state) => state.conversation.receiver);
  const { themeIndex } = useConversation();
  const tempMessageId = `temp-${Date.now()}`;

  const sendQuickMessage = async (inputValue) => {
    if (!user || !inputValue.trim()) return;

    let optimisticMessage = createTextMessage(
      conversationId,
      user._id,
      receiver,
      inputValue,
      tempMessageId
    );
    dispatch(addMessage(optimisticMessage));
    try {


      await sendTextMessageUsingSocket({
        socket,
        setConversationId,
        conversationId,
        userId: user._id,
        receiver,
        inputValue,
        sendMessage,
        dispatch,
        tempMessageId,
        // onError: (errorMessage) => {
        //   setError(errorMessage);
        //   console.error(errorMessage);
        // },
      });

    } catch (error) {
      console.error('Error sending quick message:', error);
    }
  };

  const handleEditPartClick = (lesson, idx) => {
    setEditPartLesson(lesson);
    setEditPartIdx(idx);
    setEditPartValue(lesson.lessonParts[idx]);
    setEditPartOpen(true);
  };

  const handleEditPartSubmit = async (e) => {
    e.preventDefault();
    if (editPartLesson && editPartIdx !== null) {
      const updatedParts = [...editPartLesson.lessonParts];
      updatedParts[editPartIdx] = editPartValue;
      await editQuickLesson({
        id: editPartLesson._id,
        lessonName: editPartLesson.lessonName,
        lessonParts: updatedParts,
      });
      setEditPartOpen(false);
      setEditPartLesson(null);
      setEditPartIdx(null);
      setEditPartValue("");
      refetch();

    }
  };

  const handleDeletePartClick = (lesson, idx) => {
    setDeletePartLesson(lesson);
    setDeletePartIdx(idx);
    setDeletePartOpen(true);
  };

  const handleDeletePartConfirm = async () => {
    if (deletePartLesson && deletePartIdx !== null) {
      const updatedParts = deletePartLesson.lessonParts.filter((_, idx) => idx !== deletePartIdx);
      await editQuickLesson({
        id: deletePartLesson._id,
        lessonName: deletePartLesson.lessonName,
        lessonParts: updatedParts,
      });
      setDeletePartOpen(false);
      setDeletePartLesson(null);
      setDeletePartIdx(null);
      refetch();


    }
  };

  const handleEditClick = (lesson) => {
    setEditLesson(lesson);
    setEditLessonName(lesson.lessonName);
    setEditOpen(true);
    refetch();

  };


  const handleDelete = async (id) => {
    await deleteQuickLesson(id);
    refetch();
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full font-semibold">
        <p className={`${iconColor[themeIndex]} font-semibold`}>Loading quick lessons...</p>
      </div>
    );
  }

  if (isError || !quickLessons || quickLessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full font-semibold">
        <p className={`${iconColor[themeIndex]} font-semibold`}>You have no quick lessons.</p>
        <Button
          variant="outline"
          className={`${iconColor[themeIndex]} border-r-2 border-l-2 text-sm p-2 rounded-xl mt-2`}
          onClick={() => setVisible(2)}
        >
          Add Quick Lesson
        </Button>
      </div>
    );
  }

  return (
    <div className=" max-h-full overflow-y-auto ">
      <Accordion type="multiple" className="w-full space-y-2">
        {quickLessons.map((lesson, index) => (
          <AccordionItem key={lesson._id} value={`lesson-${index}`} className="border-0">
            <div
              className="rounded-lg px-2 py-1 relative"
              style={{
                background: accordionSummaryOne[themeIndex],
              }}
            >
              <AccordionTrigger className="hover:no-underline py-3 px-2">
                <span className="text-gray-100 text-left">{lesson.lessonName}</span>
                <div className="absolute top-3 right-10 z-10 flex items-center gap-2 text-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                    onClick={() => handleDelete(lesson._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-500 hover:text-green-600 hover:bg-green-50 p-1 h-auto"
                    onClick={() => handleEditClick(lesson)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-2">
                <Accordion type="multiple" className="space-y-1">
                  {lesson.lessonParts.map((lessonDescription, idx) => (
                    <AccordionContent className="px-0 pb-2">
                      <Accordion type="multiple" className="space-y-1">
                        <AccordionItem key={idx} value={`part-${idx}`} className="border-0">
                          <div className="relative">
                            <div className="absolute top-1 right-5 z-10 flex items-center gap-2 text-lg">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                onClick={() => handleDeletePartClick(lesson, idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-500 hover:text-green-600 hover:bg-green-50 p-1 h-auto"
                                onClick={() => handleEditPartClick(lesson, idx)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                className="text-blue-500"
                                variant="ghost"
                                size="sm"
                                onClick={() => sendQuickMessage(lessonDescription)}
                              >
                                <BsSendFill className="p-[1px]" />
                              </Button>
                            </div>
                            <div
                              className="rounded-lg mb-1 pl-2"
                              style={{
                                background: accordionSummaryTwo[themeIndex],
                              }}
                            >
                              <AccordionTrigger className="hover:no-underline py-3 px-2">
                                <span className="text-gray-100 text-left">Part {idx + 1}</span>
                              </AccordionTrigger>
                              <AccordionContent
                                className="px-3 pb-3"
                                style={{
                                  background: accordionDetails[themeIndex],
                                  borderRadius: "0.5rem",
                                  margin: "0 0.5rem 0.5rem 0.5rem",
                                }}
                              >
                                <p className="text-gray-200 pt-2">{lessonDescription}</p>
                              </AccordionContent>
                            </div>
                          </div>
                        </AccordionItem>
                      </Accordion>
                    </AccordionContent>
                  ))}
                </Accordion>
              </AccordionContent>
            </div>
          </AccordionItem>
        ))}
      </Accordion>

      {editPartOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-10 backdrop-blur-[8px] z-50">
          <form
            className="bg-white p-6 rounded shadow"
            onSubmit={handleEditPartSubmit}
          >
            <label className="block mb-2 font-semibold">Edit Lesson Part</label>
            <input
              className="border p-2 mb-4 w-full"
              value={editPartValue}
              onChange={(e) => setEditPartValue(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setEditPartOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      )}

      {deletePartOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-10 backdrop-blur-[8px] z-50">
          <div className="bg-white p-6 rounded shadow">
            <p className="mb-4">Are you sure you want to delete this lesson part?</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setDeletePartOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={handleDeletePartConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}