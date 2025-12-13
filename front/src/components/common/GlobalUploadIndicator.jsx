import React from 'react';
import { useGlobalUpload } from '../../contexts/useGlobalUpload';
import './GlobalUploadIndicator.css';

const GlobalUploadIndicator = () => {
    const { uploads, removeUpload } = useGlobalUpload();
    const uploadList = Object.entries(uploads);

    if (uploadList.length === 0) return null;

    return (
        <div className="global-upload-indicator">
            {uploadList.map(([id, task]) => (
                <div key={id} className={`upload-task-item ${task.status}`}>
                    <div className="upload-task-info">
                        <span className="upload-filename" title={task.file.name}>{task.file.name}</span>
                        <span className="upload-status-text">
                            {task.status === 'uploading' && (task.progress >= 99 ? '处理中...' : `${task.progress}%`)}
                            {task.status === 'completed' && '完成'}
                            {task.status === 'error' && '失败'}
                        </span>
                    </div>
                    <div className="upload-progress-track">
                        <div 
                            className="upload-progress-bar" 
                            style={{ width: `${task.progress}%` }}
                        />
                    </div>
                    {task.status === 'error' && (
                        <button className="upload-close-btn" onClick={() => removeUpload(id)}>×</button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default GlobalUploadIndicator;
