import httpClient from './httpClient';

export async function login({ username, password }) {
  const response = await httpClient.post('/user/login', { username, password });
  return response.data;
}

export async function fetchSelfProfile() {
  const response = await httpClient.get('/user/profile/me');
  return response.data;
}

export async function fetchUserProfile(userId) {
  const response = await httpClient.get(`/user/profile/${userId}`);
  return response.data;
}

export async function fetchUserStats(userId) {
  const response = await httpClient.get(`/user/${userId}/stats`);
  return response.data;
}

export async function searchUsers(params) {
  // Backend mapping is `/api/users/search` (plural)
  const response = await httpClient.get('/users/search', { params });
  return response.data;
}

export async function register({ username, password, gender, avatarUrl }) {
  const response = await httpClient.post('/user/register', {
    username,
    password,
    gender,
    avatarUrl,
  });
  return response.data;
}

export async function changePassword({ oldPassword, newPassword }) {
  const response = await httpClient.post('/user/change-password', {
    oldPassword,
    newPassword,
  });
  return response.data;
}
