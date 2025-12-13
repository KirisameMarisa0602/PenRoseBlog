import React, { useState, useCallback } from 'react';
import GlobalUploadContext from './globalUploadContextCore';
import api from '../utils/api/httpClient';

export const GlobalUploadProvider = ({ children }) => {
    const [uploads, setUploads] = useState({});

    const startUpload = useCallback((id, file) => {
        setUploads(prev => ({ ...prev, [id]: { file, status: 'uploading', progress: 0 } }));
    }, []);

    const updateProgress = useCallback((id, progress) => {
        setUploads(prev => ({ 
            ...prev, 
            [id]: { ...prev[id], progress } 
        }));
    }, []);

    const finishUpload = useCallback((id, url) => {
        setUploads(prev => ({ 
            ...prev, 
            [id]: { ...prev[id], status: 'completed', url, progress: 100 } 
        }));
        // Auto remove after 3 seconds
        setTimeout(() => {
            setUploads(prev => {
                const newUploads = { ...prev };
                delete newUploads[id];
                return newUploads;
            });
        }, 3000);
    }, []);

    const failUpload = useCallback((id, error) => {
        setUploads(prev => ({ 
            ...prev, 
            [id]: { ...prev[id], status: 'error', error } 
        }));
    }, []);

    const removeUpload = useCallback((id) => {
        setUploads(prev => {
            const newUploads = { ...prev };
            delete newUploads[id];
            return newUploads;
        });
    }, []);

    const uploadAndSendMedia = useCallback(async ({ file, uploadUrl, sendUrl, sendBody, headers }) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        startUpload(id, file);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await api.post(uploadUrl, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    // Cap at 99% to allow time for server processing and message sending
                    if (percentCompleted >= 100) percentCompleted = 99;
                    updateProgress(id, percentCompleted);
                }
            });

            if (uploadRes.data && uploadRes.data.code === 200 && uploadRes.data.data) {
                const mediaUrl = uploadRes.data.data;
                
                // Send the message
                const finalBody = { ...sendBody, mediaUrl };
                const sendRes = await api.post(sendUrl, finalBody, { headers });

                if (sendRes.data && sendRes.data.code === 200) {
                    finishUpload(id, mediaUrl);
                    // Trigger global refresh event
                    window.dispatchEvent(new Event('pm-event'));
                    return sendRes.data.data;
                } else {
                    throw new Error(sendRes.data?.msg || '发送消息失败');
                }
            } else {
                throw new Error(uploadRes.data?.msg || '上传失败');
            }
        } catch (error) {
            console.error('Upload and send failed', error);
            failUpload(id, error.message || '未知错误');
            throw error;
        }
    }, [startUpload, updateProgress, finishUpload, failUpload]);

    return (
        <GlobalUploadContext.Provider value={{ 
            uploads, 
            startUpload, 
            updateProgress, 
            finishUpload, 
            failUpload,
            removeUpload,
            uploadAndSendMedia
        }}>
            {children}
        </GlobalUploadContext.Provider>
    );
};

