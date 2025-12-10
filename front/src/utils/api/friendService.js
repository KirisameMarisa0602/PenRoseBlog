import httpClient from './httpClient';

export async function fetchPendingFriendRequests() {
  // GET /api/friends/pending
  const response = await httpClient.get('/friends/pending');
  return response.data;
}

export async function fetchFriends() {
  // GET /api/friends/list
  const response = await httpClient.get('/friends/list');
  return response.data;
}

// 别名：与部分页面的历史导入保持一致
export async function fetchFriendsList() {
  return fetchFriends();
}

export async function sendFriendRequest(targetUserId, message) {
  // POST /api/friends/request/{targetId}
  const response = await httpClient.post(`/friends/request/${targetUserId}`, message ? { message } : null);
  return response.data;
}

export async function deleteFriend(targetUserId) {
  // DELETE /api/friends/{targetId}
  const response = await httpClient.delete(`/friends/${targetUserId}`);
  return response.data;
}

export async function fetchFriendIds() {
  // GET /api/friends/ids
  const response = await httpClient.get('/friends/ids');
  return response.data;
}

export async function isFriend(targetUserId) {
  // GET /api/friends/isFriend/{otherId}
  const response = await httpClient.get(`/friends/isFriend/${targetUserId}`);
  return response.data;
}

export async function respondToFriendRequest(requestId, accept) {
  // POST /api/friends/respond/{requestId}?accept={true|false}
  const response = await httpClient.post(`/friends/respond/${requestId}`, null, {
    params: { accept }
  });
  return response.data;
}

// 兼容：后端未提供 following 的纯 ID 列表端点，
// 这里通过分页接口 `/api/follow/following` 拉全量并映射为 ID 列表。
export async function fetchFollowingIds() {
  const resp = await httpClient.get('/follow/following', { params: { page: 0, size: 10000 } });
  const j = resp.data || {};
  let list = [];
  if (Array.isArray(j.data)) list = j.data;
  else if (j.data && Array.isArray(j.data.list)) list = j.data.list;
  const ids = (list || []).map(u => Number(u.id)).filter(n => !Number.isNaN(n));
  return { code: 200, msg: 'OK', data: ids };
}

// 关注列表（对象列表）：供 FollowingList 使用
export async function fetchFollowing() {
  // GET /api/follow/following?page=0&size=10000
  const resp = await httpClient.get('/follow/following', { params: { page: 0, size: 10000 } });
  return resp.data;
}
