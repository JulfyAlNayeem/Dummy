import { createSelector } from 'reselect';

const selectConversationState = (state) => state.conversation;
const selectConversationId = (_, conversationId) => conversationId;

export const selectMessagesByConversationId = createSelector(
  [selectConversationState, selectConversationId],
  (conversationState, conversationId) => {
    const conversation = conversationState.byConversationId[conversationId];
    return conversation?.sortedIds?.map(id => conversation.messages[id]) || [];
  }
);