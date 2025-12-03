import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { sheetColor } from '@/constant';
import { useConversation } from '@/redux/slices/conversationSlice';
import { Trash } from 'lucide-react';

const ReactionBottomSheet = ({ open, onOpenChange, reactions, userId, onRemoveReaction, messageId }) => {
    const { themeIndex } = useConversation();
    return (
        <Sheet open={open} onOpenChange={onOpenChange} className="min-h-52">
            <SheetContent side="bottom" className={`${sheetColor[themeIndex]} border-transparent rounded-t-lg m border-2 max-w-md mx-auto p-4`} sty>
                <SheetHeader>
                    <SheetTitle className="text-lg font-semibold text-white">Reactions for Message</SheetTitle>
                    <SheetDescription className="text-gray-400">
                        List of reactions and the option to remove yours.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4  min-h-52 w-full ">
                    <ul className='w-full '>
                        {Object.entries(reactions || {}).length === 0 && (
                            <li className="text-gray-400">No reactions yet.</li>
                        )}
                        {Object.entries(reactions || {}).map(([reactorId, reaction]) => (
                            <li key={reactorId} className="w-full  flex items-center justify-between">

                                <span className='text-gray-100'>{reaction.username}</span>: <span>{reaction.emoji}</span>
                                {reactorId === userId && (
                                    <button className=' flex items-start justify-center text-red-600 ' onClick={() => onRemoveReaction(reactorId)}>
                                        <Trash className='size-5' />
                                    </button>
                                )}


                            </li>
                        ))}
                    </ul>
                </div>
            </SheetContent>
            <SheetFooter>
                <SheetClose asChild>

                </SheetClose>
            </SheetFooter>
        </Sheet>
    );
};

export default ReactionBottomSheet;