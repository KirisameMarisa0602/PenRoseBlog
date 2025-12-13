import React from 'react';
import resolveUrl from '@utils/resolveUrl';

export default function ForwardFriendsModal({
    show,
    onClose,
    friends,
    friendsLoading,
    friendsError,
    onChooseFriend,
}) {
    if (!show) return null;
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 1500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    maxHeight: '80vh',
                    width: '420px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    animation: 'slideUp 0.3s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1a202c' }}>
                        选择好友转发
                    </h3>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '20px',
                            color: '#a0aec0',
                            cursor: 'pointer',
                            padding: '4px',
                            lineHeight: 1,
                        }}
                    >
                        ×
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                    {friendsLoading && <div style={{ padding: 20, textAlign: 'center', color: '#718096' }}>加载好友列表中...</div>}
                    {friendsError && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#e53e3e' }}>{friendsError}</div>
                    )}
                    {!friendsLoading && !friendsError && friends.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#718096' }}>暂无好友可转发</div>
                    )}
                    {!friendsLoading && !friendsError && friends.length > 0 && (
                        <ul
                            style={{
                                listStyle: 'none',
                                margin: 0,
                                padding: 0,
                            }}
                        >
                        {friends.map((f) => (
                            <li
                                key={f.id}
                                className="friend-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    marginBottom: 4,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                onClick={() => onChooseFriend(f.id)}
                            >
                                <img
                                    src={
                                        f.avatarUrl ? resolveUrl(f.avatarUrl) :
                                        '/imgs/loginandwelcomepanel/1.png'
                                    }
                                    alt="avatar"
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        marginRight: 12,
                                        border: '1px solid #e2e8f0',
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src =
                                            '/imgs/loginandwelcomepanel/1.png';
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: '#2d3748',
                                            fontSize: '15px',
                                        }}
                                    >
                                        {f.nickname || f.username}
                                    </div>
                                    {f.bio && (
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: '#718096',
                                                marginTop: 2,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '280px',
                                            }}
                                        >
                                            {f.bio}
                                        </div>
                                    )}
                                </div>
                                <div style={{ color: '#cbd5e0' }}>
                                    ➤
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                </div>
                <div
                    style={{
                        textAlign: 'right',
                        marginTop: 12,
                    }}
                >
                    <button type="button" onClick={onClose}>
                        关闭
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
