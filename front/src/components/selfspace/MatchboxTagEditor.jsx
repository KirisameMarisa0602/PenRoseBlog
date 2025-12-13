import React, { useState, useEffect, useRef } from 'react';
import './MatchboxTagEditor.css';

const MatchboxTagEditor = ({ tags, onTagsChange, readOnly = false }) => {
    const [tagList, setTagList] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);

    // Parse tags string to array on mount or prop change
    useEffect(() => {
        if (typeof tags === 'string') {
            // Split by comma (English or Chinese) and filter empty
            const splitTags = tags.split(/[,，]/).map(t => t.trim()).filter(t => t);
            setTagList(splitTags);
        } else if (Array.isArray(tags)) {
            setTagList(tags);
        } else {
            setTagList([]);
        }
    }, [tags]);

    // Focus input when editing starts
    useEffect(() => {
        if (editingIndex !== null && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingIndex]);

    const updateParent = (newList) => {
        // Join with English comma
        const tagString = newList.join(',');
        onTagsChange(tagString);
    };

    const handleAddTag = () => {
        if (readOnly) return;
        // Add a placeholder and start editing it
        const newList = [...tagList, ''];
        setTagList(newList);
        setEditingIndex(newList.length - 1);
        setEditValue('');
    };

    const handleDeleteTag = (e, index) => {
        if (readOnly) return;
        e.stopPropagation(); // Prevent triggering edit
        const newList = tagList.filter((_, i) => i !== index);
        setTagList(newList);
        updateParent(newList);
        if (editingIndex === index) {
            setEditingIndex(null);
        }
    };

    const startEditing = (index) => {
        if (readOnly) return;
        setEditingIndex(index);
        setEditValue(tagList[index]);
    };

    const saveEdit = () => {
        if (editingIndex === null) return;

        const trimmed = editValue.trim();
        let newList;
        
        if (trimmed) {
            newList = [...tagList];
            newList[editingIndex] = trimmed;
        } else {
            // If empty, remove it
            newList = tagList.filter((_, i) => i !== editingIndex);
        }

        setTagList(newList);
        updateParent(newList);
        setEditingIndex(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    };

    return (
        <div className={`matchbox-wrapper ${readOnly ? 'readonly' : ''}`}>
            <div className="matchbox-container">
                
                {/* The Inner Drawer (Tags) */}
                <div className="mb-inner">
                    <div className="floor"></div>
                    <div className="mb-tray">
                        <div className="mb-tray-scroll">
                            {tagList.map((tag, index) => (
                                <div 
                                    key={index} 
                                    className={`mb-match ${readOnly ? 'readonly' : ''}`}
                                    onClick={() => startEditing(index)}
                                    style={{ cursor: readOnly ? 'default' : 'pointer' }}
                                >
                                    {editingIndex === index ? (
                                        <input
                                            ref={inputRef}
                                            className="mb-match-input"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={saveEdit}
                                            onKeyDown={handleKeyDown}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <>
                                            <span className="mb-match-text">{tag}</span>
                                            {!readOnly && (
                                                <span 
                                                    className="mb-match-delete"
                                                    onClick={(e) => handleDeleteTag(e, index)}
                                                >
                                                    ✕
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                            
                            {/* Add New Button */}
                            {editingIndex === null && !readOnly && (
                                <div className="mb-match add-new" onClick={handleAddTag}>
                                    <span className="mb-match-text" style={{textAlign: 'center', color: '#555'}}>
                                        + New Tag
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* The Outer Box */}
                <div className="mb-outer">
                    <div className="mb-face back"></div>
                    <div className="mb-face right"></div>
                    <div className="mb-face left"></div>
                    <div className="mb-face top"></div>
                    <div className="mb-face bottom"></div>
                    <div className="mb-face front">
                        <div className="mb-label-circle">
                            <div className="mb-label-text">
                                个人<br/>标签
                            </div>
                        </div>
                        <div className="mb-subtext">PERSONALITY</div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MatchboxTagEditor;
