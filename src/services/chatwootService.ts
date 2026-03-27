import axios from 'axios';
import { env } from '../config/env';

const api = axios.create({
  baseURL: `${env.CHATWOOT_URL}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}`,
  headers: {
    api_access_token: env.CHATWOOT_API_TOKEN,
    'Content-Type': 'application/json',
  },
});

export const chatwootService = {
  /**
   * Send a message to a specific Chatwoot conversation.
   * By default, it sends as a private response. To send directly to the customer, private should be false.
   */
  async sendMessage(conversationId: number, content: string, isPrivate: boolean = false) {
    try {
      const response = await api.post(`/conversations/${conversationId}/messages`, {
        content,
        message_type: 'outgoing',
        private: isPrivate,
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error sending message to conversation ${conversationId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Toggle conversation status to 'open' to handle handoff to a human agent.
   */
  async assignToHuman(conversationId: number) {
    try {
      // Typically, transferring to a human involves changing the conversation status to 'open'
      // and optionally assigning it to an agent or a different team/inbox.
      // Here we simply set it to 'open'.
      const response = await api.post(`/conversations/${conversationId}/toggle_status`, {
        status: 'open',
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error changing status for conversation ${conversationId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Retrieves conversation details (to find inbox_id, status, etc., if needed)
   */
  async getConversation(conversationId: number) {
    try {
      const response = await api.get(`/conversations/${conversationId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching conversation ${conversationId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Retrieves conversation messages to build conversational memory.
   */
  async getConversationMessages(conversationId: number) {
    try {
      const response = await api.get(`/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error?.response?.data || error.message);
      return { payload: [] };
    }
  }
};
