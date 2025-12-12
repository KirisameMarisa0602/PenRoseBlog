import { useContext } from 'react';
import GlobalUploadContext from './globalUploadContextCore';

export const useGlobalUpload = () => {
    const context = useContext(GlobalUploadContext);
    if (!context) {
        throw new Error('useGlobalUpload must be used within a GlobalUploadProvider');
    }
    return context;
};

export default useGlobalUpload;
