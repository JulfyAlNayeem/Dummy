import React from "react";
import { useDispatch } from "react-redux";
import {
    useDeleteConversationMutation,
    useUpdateMessageRequestStatusMutation,
} from "@/redux/api/conversationApi";
import { useConversation, setBlockList } from "@/redux/slices/conversationSlice";
import {
    useBlockUserMutation,
} from "@/redux/api/user/userApi";
import UnblockButton from "../chat/UnblockButton";

export const handleBlock = async (blockUser, participant, conversationId, dispatch ) => {
    console.log(blockUser, participant, conversationId, dispatch)
    try {
        const res = await blockUser({
            blockedId: participant._id,
            conversationId,
        }).unwrap();

        if (res?.conversation?.blockList) {
            dispatch(setBlockList(res.conversation.blockList));
        }
    } catch (err) {
        console.error("Failed to block user:", err);
    }
};

const RequestActionButtons = () => {
    const dispatch = useDispatch();
    const { conversationStatus, conversationId, participant, blockList } = useConversation();
    const [updateMessageRequestStatus] = useUpdateMessageRequestStatusMutation();
    const [deleteConversation, { isLoading }] = useDeleteConversationMutation();
    const [blockUser] = useBlockUserMutation();

    //  check if participant is blocked
    const isParticipantBlocked = blockList?.some(
        (entry) => entry.blockedUser === participant._id
    );


    return (
        <div className="">
            {conversationStatus === "pending" && (
                <p className="text-xs text-gray-200 text-center mb-3">
                    If you accept, {participant.name} will be able to call you and may see
                    info such as your Active Status and when you've read messages.
                </p>
            )}

            {!isParticipantBlocked ? (
                <div className="flex justify-between">
                    {/* Delete */}
                    <button
                        className="bg-red-600 flex-1 mx-1 py-2 rounded-md text-sm hover:bg-red-700"
                        disabled={isLoading}
                        onClick={async () =>
                            await deleteConversation(conversationId).unwrap()
                        }
                    >
                        Delete
                    </button>

                    <button
                        className="bg-gray-600 flex-1 mx-1 py-2 rounded-md text-sm hover:bg-gray-700"
                        onClick={()=>handleBlock(blockUser, participant, conversationId, dispatch)}
                    >
                        Block
                    </button>

                    <button
                        className="bg-green-600 flex-1 mx-1 py-2 rounded-md text-sm hover:bg-green-700"
                        onClick={() =>
                            updateMessageRequestStatus({
                                conversationId,
                                status: "accepted",
                            })
                        }
                    >
                        Accept
                    </button>
                </div>
            ) : (
                <UnblockButton />
            )}
        </div>
    );
};

export default RequestActionButtons;
