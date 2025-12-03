import { useUnblockUserMutation } from '@/redux/api/user/userApi';
import { useConversation, setBlockList } from "@/redux/slices/conversationSlice";
import React from 'react'
import { useDispatch } from 'react-redux';

const UnblockButton = () => {
    const dispatch = useDispatch();

    const [unblockUser] = useUnblockUserMutation();
    const { conversationId, participant } = useConversation();
    const handleUnblock = async () => {
        try {
            const res = await unblockUser({
                userId: participant._id,
                conversationId,
            }).unwrap();

            if (res?.conversation?.blockList) {
                dispatch(setBlockList(res.conversation.blockList));
            }
        } catch (err) {
            console.error("Failed to unblock user:", err);
        }
    };

    return (
        <div className="w-full flex items-center justify-center mt-3 ">
            <button
                className="bg-[#4b75a5] flex-1 mx-1 py-2 rounded-md text-sm font-semibold text- hover:bg-gray-700 min-w-[148px]  max-w-[248px]"
                onClick={handleUnblock}
            >
                Unblock
            </button>
        </div>
    )
}

export default UnblockButton
