import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/atom-one-dark.css';

const AiSummarySidebar = ({ summary, loading, onSummarize }) => {
    React.useEffect(() => {
        console.log('[AiSummarySidebar] mounted, summary:', !!summary, 'loading:', loading);
    }, [summary, loading]);

    return (
        <div className="sidebar-card ai-summary-card" style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            marginBottom: '20px',
            border: '1px solid rgba(0,0,0,0.04)',
            height: '360px',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div className="sidebar-header" style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px'
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#ai-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <defs>
                        <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI 智能摘要</h3>
            </div>

            <div className="sidebar-content" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
                {!summary && !loading && (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                            太长不看？让 AI 为您生成文章摘要。
                        </p>
                        <button
                            onClick={onSummarize}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.3s ease',
                                width: '100%'
                            }}
                            onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                        >
                            ✨ 生成摘要
                        </button>
                    </div>
                )}

                {loading && !summary && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', color: '#666' }}>
                        <div className="ai-loading-spinner" style={{ marginBottom: '10px' }}></div>
                        <span style={{ fontSize: '13px' }}>正在思考中...</span>
                    </div>
                )}

                {(summary || (loading && summary)) && (
                    <div className="ai-summary-markdown" style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                                code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className={className} style={{ background: '#f3f4f6', padding: '2px 4px', borderRadius: '4px', fontSize: '0.9em' }} {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                        {loading && <span className="typing-cursor">|</span>}
                    </div>
                )}
            </div>
            <style>{`
                .ai-loading-spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid #e0e7ff;
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .typing-cursor {
                    display: inline-block;
                    width: 2px;
                    background-color: #6366f1;
                    animation: blink 1s step-end infinite;
                    margin-left: 2px;
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .ai-summary-markdown p {
                    margin-bottom: 10px;
                }
                .ai-summary-markdown ul, .ai-summary-markdown ol {
                    padding-left: 20px;
                    margin-bottom: 10px;
                }
                .ai-summary-markdown li {
                    margin-bottom: 4px;
                }
                .ai-summary-markdown h1, .ai-summary-markdown h2, .ai-summary-markdown h3 {
                    margin-top: 15px;
                    margin-bottom: 8px;
                    font-size: 1.1em;
                }
                .ai-summary-markdown blockquote {
                    border-left: 3px solid #e5e7eb;
                    padding-left: 10px;
                    color: #6b7280;
                    margin: 10px 0;
                }
                .ai-summary-markdown pre {
                    background: #282c34;
                    padding: 10px;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin-bottom: 10px;
                }
                .ai-summary-markdown code {
                    font-family: 'Space Mono', monospace;
                }

                /* Keep scrolling but hide scrollbar (matches app-wide style) */
                .ai-summary-card .sidebar-content {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .ai-summary-card .sidebar-content::-webkit-scrollbar {
                    width: 0;
                    height: 0;
                }
            `}</style>
        </div>
    );
};

export default AiSummarySidebar;
