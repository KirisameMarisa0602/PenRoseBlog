import React, { useState, useCallback } from 'react';
import GlobalUploadContext from './globalUploadContextCore';
import api from '../utils/api/httpClient';
import axios from 'axios';

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

    const uploadAndSendMedia = useCallback(async ({ file, uploadUrl, sendUrl, sendBody, headers, otherId }) => {
        // 1. 前置检查：文件大小限制 (128MB)
        const MAX_SIZE = 128 * 1024 * 1024; // 128MB
        if (file.size > MAX_SIZE) {
            const errorMsg = `文件大小超过限制 (128MB)，当前文件: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
            // 这里虽然没有 id，但为了统一错误处理，我们可以生成一个临时的 id 来展示错误，或者直接抛出
            // 由于调用方 catch 了 error，直接 throw 即可
            throw new Error(errorMsg);
        }

        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        startUpload(id, file);

        try {
            let mediaUrl = '';

            // 优先尝试使用预签名 URL 上传 (Direct to COS)
            if (otherId) {
                try {
                    const presignRes = await api.get('/file/presigned-message-url', {
                        params: { fileName: file.name, otherId },
                        headers
                    });
                    
                    if (presignRes.data && presignRes.data.code === 200 && presignRes.data.data) {
                        const { uploadUrl: cosPutUrl, publicUrl } = presignRes.data.data;
                        
                        // 直接 PUT 到 COS
                        await axios.put(cosPutUrl, file, {
                            headers: { 'Content-Type': file.type || 'application/octet-stream' },
                            onUploadProgress: (progressEvent) => {
                                let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                if (percentCompleted >= 100) percentCompleted = 99;
                                updateProgress(id, percentCompleted);
                            }
                        });
                        
                        mediaUrl = publicUrl;
                    }
                } catch (err) {
                    console.warn('Presigned upload failed, falling back to server proxy', err);
                }
            }

            // 如果预签名上传失败或未提供 otherId，回退到服务器代理上传
            if (!mediaUrl) {
                const formData = new FormData();
                formData.append('file', file);

                const uploadRes = await api.post(uploadUrl, formData, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        if (percentCompleted >= 100) percentCompleted = 99;
                        updateProgress(id, percentCompleted);
                    }
                });

                if (uploadRes.data && uploadRes.data.code === 200 && uploadRes.data.data) {
                    mediaUrl = uploadRes.data.data;
                } else {
                    throw new Error(uploadRes.data?.msg || '上传失败');
                }
            }
            
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

