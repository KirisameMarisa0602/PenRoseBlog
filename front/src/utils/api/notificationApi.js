import httpClient from './httpClient';

const API_BASE_URL = '/notifications';

export const notificationApi = {
    getNotifications: async (page = 0, size = 20, types = []) => {
        const params = { page, size };
        if (types && types.length > 0) {
            params.types = types.join(',');
        }
        const response = await httpClient.get(API_BASE_URL, {
            params
        });
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await httpClient.get(`${API_BASE_URL}/unread-count`);
        return response.data;
    },

    markAsRead: async (id) => {
        const response = await httpClient.put(`${API_BASE_URL}/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await httpClient.put(`${API_BASE_URL}/read-all`);
        return response.data;
    }
};
