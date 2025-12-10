import httpClient from './httpClient';

export async function follow(targetId) {
  const response = await httpClient.post(`/follow/${targetId}`);
  return response.data;
}

export async function unfollow(targetId) {
  const response = await httpClient.delete(`/follow/${targetId}`);
  return response.data;
}

// Following列表分页：由调用方直接使用 /api/follow/following 接口（另见后端）
// 如需ids，后端未提供 /follow/followingIds；改由业务直接拉取分页数据并映射。
