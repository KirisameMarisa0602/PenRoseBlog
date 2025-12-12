import React, { useState, useCallback } from 'react';
import GlobalUploadContext from './globalUploadContextCore';

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

    return (
        <GlobalUploadContext.Provider value={{ 
            uploads, 
            startUpload, 
            updateProgress, 
            finishUpload, 
            failUpload,
            removeUpload
        }}>
            {children}
        </GlobalUploadContext.Provider>
    );
};

