import React, { useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FiPlus } from "react-icons/fi";
import { accordionSummaryOne, borderColor, cardClass, firstButton, secondButton, sheetColor } from "@/constant";
import { useUser } from "@/redux/slices/authSlice";
import {
  useFetchQuickMessagesQuery,
  useAddQuickMessageMutation,
  useEditQuickMessageMutation,
  useDeleteQuickMessageMutation,
} from "@/redux/api/quickMessageApi";
import { useCreateConversationMutation } from "@/redux/api/conversationApi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserAuth } from "../../context-reducer/UserAuthContext";
import { useSelector, useDispatch } from "react-redux";

import { useSendMessageMutation } from "@/redux/api/messageApi";
import { addMessage, updateMessage, useConversation } from "@/redux/slices/conversationSlice"; 
import { createTextMessage } from "@/lib/optimisticMessageFormat";
import { sendTextMessageUsingSocket } from "./EmojiContainer";

const QuickMessage = ({ setConversationId, conversationId }) => {
  const dispatch = useDispatch();
  const { user, socket } = useUserAuth();
  const {themeIndex} = useConversation();
  const receiver = useSelector((state) => state.conversation.receiver);
  const tempMessageId = `temp-${Date.now()}`;

  // RTK Query hooks
  const { data: quickMessages = [], refetch } = useFetchQuickMessagesQuery();
  const [addQuickMessage] = useAddQuickMessageMutation();
  const [editQuickMessage] = useEditQuickMessageMutation();
  const [deleteQuickMessage] = useDeleteQuickMessageMutation();
  const [sendMessage] = useSendMessageMutation();

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
        onError: (errorMessage) => {
          setError(errorMessage);
          console.error(errorMessage);
        },
      });

    } catch (error) {
      console.error('Error sending quick message:', error);
    }
  };

  // State for Add Dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // State for Edit/Delete
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [openDelete, setOpenDelete] = useState(false);

  // Add Quick Message
  const handleAdd = async () => {
    if (newTitle && newMessage) {
      await addQuickMessage({ title: newTitle, message: newMessage });
      setNewTitle("");
      setNewMessage("");
      setOpenAdd(false);
      // refetch();
    }
  };

  // Edit Quick Message
  const handleEdit = async () => {
    if (editTitle && editMessage && selectedMsg) {
      await editQuickMessage({ id: selectedMsg._id, title: editTitle, message: editMessage });
      setOpenEdit(false);
      setSelectedMsg(null);
      // refetch();
    }
  };

  // Delete Quick Message
  const handleDelete = async () => {
    if (selectedMsg) {
      await deleteQuickMessage(selectedMsg._id);
      setOpenDelete(false);
      setSelectedMsg(null);
      // refetch();
    }
  };

  return (
    <>
      {quickMessages.length > 0 ? (
        <div className="mt-2 w-full max-h-full overflow-y-auto px-6 pb-4 grid md:grid-cols-5 grid-cols-3 gap-2 text-blue-400 mb-5  overflow-x-auto">
          <>
            {/* List of Quick Messages */}
            {quickMessages.map((data) => (
              <div
                className={`text-sm rounded-full between min-w-24 max-w-32 pl-2 pr-2 ${cardClass[themeIndex]} shadow-lg`}
                key={data._id}
              >
                <Button
                  variant="ghost"
                  className="flex-1 justify-center text-sm hover:text-gray-300 truncate px-2 py-2 h-auto rounded-full hover:bg-transparent"
                  onClick={() => sendQuickMessage(data.message)}
                >
                  {data.title}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span>
                      <BsThreeDotsVertical className="text-xs cursor-pointer" />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedMsg(data);
                        setEditTitle(data.title);
                        setEditMessage(data.message);
                        setOpenEdit(true);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedMsg(data);
                        setOpenDelete(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {/* Add Button */}
            <Button
              variant="secondary"
              className=" mr-2 border-2 bg-white/30  rounded-full min-w-24 py-4 flex items-center justify-center"
              onClick={() => setOpenAdd(true)}
            >
              <FiPlus className="h-6 w-6 text-green-400" />
            </Button>

            {/* Edit Dialog */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Quick Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Enter title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-message">Message</Label>
                    <Textarea
                      id="edit-message"
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      placeholder="Enter message"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenEdit(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEdit}>Update</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Delete Quick Message</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this quick message? This action cannot be undone.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenDelete(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center flex-col">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2 text-gray-100">Quick Messages</h1>
            <p className="text-muted-foreground text-gray-100">
              Add Your Most Common Messages
            </p>
          </div>
          <Button
            variant="secondary"
            className="w-full max-w-64 rounded-full min-h-[36px] flex items-center justify-center"
            onClick={() => setOpenAdd(true)}
          >
            <FiPlus className="h-6 w-6 text-green-400" />
          </Button>
        </div>
      )}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className={`${sheetColor[themeIndex]}  sm:max-w-[425px] border-transparent`}>
          <DialogHeader>
            <DialogTitle>Add Quick Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className=" placeholder:text-white"
                placeholder="Enter title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className=" placeholder:text-white focus:outline-none"
                placeholder="Enter message"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className={`${firstButton[themeIndex]}`} variant="outline" onClick={() => setOpenAdd(false)}>
              Cancel
            </Button>
            <Button className={`${secondButton[themeIndex]}`} onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickMessage;