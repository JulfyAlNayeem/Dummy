import { createSelector } from 'reselect';

const selectConversationState = (state: any): any => state.conversation;
const selectConversationId = (_: any, conversationId: any): any => conversationId;

export const selectMessagesByConversationId = createSelector(
  [selectConversationState, selectConversationId],
  (conversationState, conversationId) => {
    const conversation = conversationState.byConversationId[conversationId];
    return conversation?.sortedIds?.map(id => conversation.messages[id]) || [];
  }
);