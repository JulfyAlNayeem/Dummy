// @ts-nocheck
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Edit } from "lucide-react";
import { accordionDetails, accordionSummaryOne, accordionSummaryTwo, sheetColor } from "../../constant";
import { themeIcon } from "@/lib/themeUtils";
import { useRef } from "react";
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
import { Textarea } from "../ui/textarea";

export default function QuickLesson({ setVisible }: { setVisible: (v: boolean) => void }): JSX.Element {
  const conversationId: any = useSelector((state: any) => state.conversation.conversationId);
  const { data: quickLessons = [], refetch, isFetching, isError }: any = useFetchQuickLessonsQuery(conversationId, { skip: !conversationId || conversationId === 'new' });
  const [editQuickLesson]: any = useEditQuickLessonMutation();
  const [deleteQuickLesson]: any = useDeleteQuickLessonMutation();
  const [sendMessage]: any = useSendMessageMutation();

  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editLesson, setEditLesson] = useState<any>(null);
  const [editLessonName, setEditLessonName] = useState<string>('');


  const [editPartOpen, setEditPartOpen] = useState<boolean>(false);
  const [editPartValue, setEditPartValue] = useState<string>('');
  const [editPartIdx, setEditPartIdx] = useState<number | null>(null);
  const [editPartLesson, setEditPartLesson] = useState<any>(null);
  const editPartTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = (textarea: HTMLTextAreaElement): void => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

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
    setTimeout(() => autoResize(editPartTextareaRef.current), 0);
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
        <p className={themeIcon(themeIndex, "font-semibold")}>Loading quick lessons...</p>
      </div>
    );
  }

  if (isError || !quickLessons || quickLessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full font-semibold">
        <p className={themeIcon(themeIndex, "font-semibold")}>You have no quick lessons.</p>
        <Button
          variant="outline"
          className={themeIcon(themeIndex, "border-r-2 border-l-2 text-sm p-2 rounded-xl mt-2")}
          onClick={() => setVisible(2)}
        >
          Add Quick Lesson
        </Button>
      </div>
    );
  }

  return (
    <div className=" max-h-full overflow-y-auto md:h-[90vh]">
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

      <Dialog open={editPartOpen} onOpenChange={setEditPartOpen}>
        <DialogContent className={`border border-transparent ${sheetColor[themeIndex]}`}>
          <DialogHeader>
            <DialogTitle>Edit Lesson Part</DialogTitle>
            <DialogDescription>Update the selected quick lesson part content.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPartSubmit} className="space-y-4">
            <Textarea
              ref={editPartTextareaRef}
              className="w-full overflow-hidden resize-none"
              value={editPartValue}
              onChange={(e) => {
                setEditPartValue(e.target.value);
                autoResize(e.target);
              }}
              onInput={(e) => autoResize(e.target)}
            />
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setEditPartOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePartOpen} onOpenChange={setDeletePartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson Part</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson part? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletePartOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeletePartConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}