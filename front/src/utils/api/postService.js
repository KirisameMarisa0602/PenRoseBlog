import httpClient from './httpClient';

export async function fetchPosts({ page, size, sortMode, category }) {
  const params = { page, size, sortMode };
  if (category) {
    params.categoryName = category;
  }
  const response = await httpClient.get('/blogpost', {
    params,
  });
  return response.data;
}

export async function fetchPostDetail(id, params = {}) {
  const response = await httpClient.get(`/blogpost/${id}`, { params });
  return response.data;
}

export async function createOrUpdatePost(payload) {
  const { id, ...rest } = payload;
  const url = id ? `/blogpost/${id}` : '/blogpost';
  const method = id ? 'put' : 'post';
  const response = await httpClient[method](url, rest);
  return response.data;
}

export async function recordPostView({ blogPostId, userId }) {
  const payload = { blogPostId };
  if (userId) payload.userId = userId;
  const response = await httpClient.post('/blogview/record', payload);
  return response.data;
}

export async function fetchFavorites({ userId, page, size }) {
  const response = await httpClient.get('/blogpost/favorites', {
    params: { userId, page, size },
  });
  return response.data;
}

export async function toggleFavorite(id, userId) {
  const response = await httpClient.post(`/blogpost/${id}/favorite`, null, {
    params: { userId },
  });
  return response.data;
}

export async function sharePost(id, userId) {
  const response = await httpClient.post(`/blogpost/${id}/share`, null, {
    params: { userId }
  });
  return response.data;
}

export async function fetchTopPostsPerCategory() {
  const response = await httpClient.get('/blogpost/top-per-category');
  return response.data;
}

export async function deletePost(id, userId) {
  const response = await httpClient.delete(`/blogpost/${id}`, {
    params: { userId },
  });
  return response.data;
}
