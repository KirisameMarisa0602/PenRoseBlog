import httpClient from './httpClient';

export async function fetchComments(postId) {
  const response = await httpClient.get(`/comment/list/${postId}`, {
    params: { size: 10000 },
  });
  return response.data;
}

export async function addComment({ postId, content, parentId, userId }) {
  const response = await httpClient.post('/blogpost/comment', {
    blogPostId: postId,
    content,
    parentId,
    userId,
  });
  return response.data;
}

export async function addReply({ commentId, content, mentionUserId, userId }) {
  const response = await httpClient.post('/comment-reply', {
    commentId,
    content,
    mentionUserId,
    userId,
  });
  return response.data;
}

export async function fetchReplies(commentId, params = {}) {
  const response = await httpClient.get(`/comment-reply/list/${commentId}`, {
    params: { size: 10000, ...params },
  });
  return response.data;
}
