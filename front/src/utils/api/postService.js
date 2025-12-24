import httpClient from './httpClient';

export async function fetchPosts({
  page,
  size,
  sortMode,
  category,
  keyword,
  userId,
  directory,
  categoryName,
  status,
  currentUserId,
} = {}) {
  const params = { page, size };

  if (sortMode) params.sortMode = sortMode;
  if (keyword) params.keyword = keyword;
  if (userId !== undefined && userId !== null && userId !== '') params.userId = userId;
  if (directory) params.directory = directory;
  if (status) params.status = status;
  if (currentUserId !== undefined && currentUserId !== null && currentUserId !== '') params.currentUserId = currentUserId;

  // 兼容：老调用使用 category，新调用可用 categoryName
  const cat = categoryName || category;
  if (cat) params.categoryName = cat;

  const response = await httpClient.get('/blogpost', { params });
  return response.data;
}

export async function fetchPostDetail(id, params = {}) {
  const response = await httpClient.get(`/blogpost/${id}`, { params });
  return response.data;
}

export async function fetchDirectories(userId) {
  const response = await httpClient.get('/blogpost/directories', {
    params: { userId },
  });
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

export async function fetchFavorites({ userId, page, size, categoryName }) {
  const params = { userId, page, size };
  if (categoryName) params.categoryName = categoryName;
  const response = await httpClient.get('/blogpost/favorites', { params });
  return response.data;
}

export async function togglePostLike(id) {
  const response = await httpClient.post(`/blogpost/${id}/like`);
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

export async function fetchShareUrl(id) {
  const response = await httpClient.get(`/blogpost/${id}/share-url`);
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
