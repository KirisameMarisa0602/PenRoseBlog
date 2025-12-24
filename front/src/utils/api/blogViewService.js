import httpClient from './httpClient';

export async function fetchBlogViewBatch(ids) {
  const response = await httpClient.post('/blogview/batch', ids);
  return response.data;
}
