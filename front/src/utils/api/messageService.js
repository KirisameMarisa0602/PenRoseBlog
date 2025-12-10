import httpClient from './httpClient';

export async function fetchConversations() {
  const response = await httpClient.get('/messages/conversation/list');
  return response.data;
}

export async function fetchConversationDetail(otherId, { page = 0, size = 20 } = {}) {
  const response = await httpClient.get(`/messages/conversation/${otherId}`, {
    params: { page, size },
  });
  return response.data;
}

export async function sendPrivateMessage({ receiverId, content }) {
  const response = await httpClient.post('/messages', { receiverId, content });
  return response.data;
}

export async function markConversationRead(otherId) {
  const response = await httpClient.post(`/messages/conversation/${otherId}/read`);
  return response.data;
}

export async function recallMessage(messageId) {
  const response = await httpClient.post('/messages/recall', { id: messageId });
  return response.data;
}

export async function deleteMessage(messageId) {
  const response = await httpClient.post('/messages/delete', { id: messageId });
  return response.data;
}

export async function fetchUnreadTotal() {
  const response = await httpClient.get('/messages/unread/total');
  return response.data;
}
