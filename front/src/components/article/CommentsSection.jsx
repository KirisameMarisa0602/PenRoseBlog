import React from 'react';
import { Link } from 'react-router-dom';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';

// Icons
const iconLike = '/icons/blogpost/点赞.svg';
const iconComment = '/icons/blogpost/评论.svg';

export default function CommentsSection({
    userId,
    commentText,
    setCommentText,
    onSubmitComment,
    commentsSortMode,
    setCommentsSort,
    displayedComments,
    totalComments,
    commentsPage,
    commentsTotalPages,
    commentsPerPage,
    goCommentsPage,
    openReplies,
    hotRepliesMap,
    openCommentReplyAndScroll,
    getDisplayedReplies,
    repliesMap,
    repliesPerPage,
    goRepliesPage,
    toggleReplyLike,
    startReplyToReply,
    toggleCommentLike,
    toggleRepliesPanel,
    replyTextMap,
    setReplyTextMap,
    handleSubmitReply,
}) {
    return (
        <section className="article-comments" id="comments-section">
            <h3 className="comments-title">评论 ({totalComments})</h3>
            <form onSubmit={onSubmitComment} className="comment-form">
                {userId ? (
                    <>
                        <textarea
                            id="commentText"
                            aria-label="发表评论"
                            placeholder="写下你的想法，文明评论~"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            required
                            className="comment-textarea"
                        />
                        <div className="comment-form-footer">
                            <button type="submit" className="comment-submit-btn">发表评论</button>
                        </div>
                    </>
                ) : (
                    <div className="comment-login-prompt">
                        请先 <a href="/welcome">登录</a> 后发表评论~
                    </div>
                )}
            </form>

            <div className="comment-sort-controls">
                <button
                    type="button"
                    className={`sort-btn ${commentsSortMode === 'hot' ? 'active' : ''}`}
                    onClick={() => setCommentsSort('hot')}
                >
                    按热度
                </button>
                <span className="sort-divider">|</span>
                <button
                    type="button"
                    className={`sort-btn ${commentsSortMode === 'time' ? 'active' : ''}`}
                    onClick={() => setCommentsSort('time')}
                >
                    按时间
                </button>
            </div>

            <div className="comments-list">
                {displayedComments.map((c) => (
                    <div key={c.id} id={`comment-${c.id}`} className="comment-item">
                        <div className="comment-avatar-wrapper">
                            <Link
                                to={`/selfspace?userId=${c.userId || c.authorId || c.uid || ''}`}
                                title={c.nickname || '用户主页'}
                            >
                                <img src={resolveUrl(c.avatarUrl) || getDefaultAvatar(c.userId || c.authorId || c.uid)} alt="avatar" className="comment-avatar-img" />
                            </Link>
                        </div>
                        <div className="comment-main-content">
                            <div className="comment-header-info">
                                <span className="comment-author-name">{c.nickname}</span>
                                <span className="comment-publish-time">{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="comment-text-body">{c.content}</div>

                            <div className="comment-actions-bar">
                                <button
                                    type="button"
                                    className={`comment-action-btn ${c.likedByCurrentUser ? 'liked' : ''}`}
                                    onClick={() => toggleCommentLike(c.id)}
                                >
                                    <img src={iconLike} alt="like" className="action-icon" />
                                    <span className="count">{c.likeCount || 0}</span>
                                </button>
                                <button
                                    type="button"
                                    className="comment-action-btn"
                                    onClick={() => toggleRepliesPanel(c.id)}
                                >
                                    <img src={iconComment} alt="reply" className="action-icon" />
                                    <span className="count">{openReplies[c.id] ? '收起回复' : (c.replyCount || (repliesMap[c.id] || []).length || '回复')}</span>
                                </button>
                            </div>

                            {/* 热门回复预览 */}
                            {!openReplies[c.id] && hotRepliesMap[c.id] && hotRepliesMap[c.id].length > 0 && (
                                <div className="hot-replies-preview">
                                    <div className="hot-replies-title">热门回复</div>
                                    {hotRepliesMap[c.id].slice(0, 3).map((hr) => (
                                        <div key={hr.id} className="hot-reply-item" onClick={() => openCommentReplyAndScroll(c.id, hr.id)}>
                                            <span className="hot-reply-user">{hr.nickname}:</span>
                                            <span className="hot-reply-content">{(hr.content || '').slice(0, 60)}</span>
                                        </div>
                                    ))}
                                    <div className="hot-replies-more" onClick={() => toggleRepliesPanel(c.id)}>查看更多回复</div>
                                </div>
                            )}

                            {/* 回复区域 */}
                            {openReplies[c.id] && (
                                <div className="replies-container">
                                    {/* 回复输入框 */}
                                    {userId && (
                                        <form className="reply-form" onSubmit={(e) => handleSubmitReply(e, c.id)}>
                                            <textarea
                                                placeholder={`回复 @${c.nickname}...`}
                                                value={replyTextMap[c.id] || ''}
                                                onChange={(e) => setReplyTextMap((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                                required
                                                className="reply-textarea"
                                            />
                                            <button type="submit" className="reply-submit-btn">回复</button>
                                        </form>
                                    )}

                                    <div className="replies-list">
                                        {getDisplayedReplies(c.id).slice.map((r) => {
                                            const m = (r.content || '').match(/^@([^\s]+)\s+/);
                                            let mentionTargetId = r.replyToUserId || r.replyToId || null;
                                            if (!mentionTargetId && m) {
                                                const nick = m[1];
                                                const foundInReplies = (repliesMap[c.id] || []).find((rr) => rr.nickname === nick);
                                                if (foundInReplies) mentionTargetId = foundInReplies.userId;
                                            }
                                            return (
                                                <div key={r.id} id={`reply-${r.id}`} className="reply-item">
                                                    <Link to={`/selfspace?userId=${r.userId}`} className="reply-avatar-link">
                                                        <img src={resolveUrl(r.avatarUrl) || getDefaultAvatar(r.userId)} alt="avatar" className="reply-avatar-img" />
                                                    </Link>
                                                    <div className="reply-content-wrapper">
                                                        <div className="reply-header-info">
                                                            <span className="reply-author-name">{r.nickname}</span>
                                                            {m && (
                                                                <span className="reply-target">
                                                                    回复 <Link to={mentionTargetId ? `/selfspace?userId=${mentionTargetId}` : '#'} className="mention-link">@{m[1]}</Link>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="reply-text-body">
                                                            {m ? r.content.slice(m[0].length) : r.content}
                                                        </div>
                                                        <div className="reply-info-footer">
                                                            <span className="reply-time">{new Date(r.createdAt).toLocaleString()}</span>
                                                            <div className="reply-actions-bar">
                                                                <button
                                                                    type="button"
                                                                    className={`reply-action-btn ${r.likedByCurrentUser ? 'liked' : ''}`}
                                                                    onClick={() => toggleReplyLike(r.id, c.id)}
                                                                >
                                                                    <img src={iconLike} alt="like" className="action-icon" />
                                                                    <span className="count">{r.likeCount || 0}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="reply-action-btn"
                                                                    onClick={() => startReplyToReply(c.id, r.userId, r.nickname)}
                                                                >
                                                                    回复
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* 回复分页 */}
                                    {(repliesMap[c.id] || []).length > repliesPerPage && (() => {
                                        const rp = getDisplayedReplies(c.id);
                                        return (
                                            <div className="replies-pagination">
                                                <button onClick={() => goRepliesPage(c.id, rp.page - 1)} disabled={rp.page <= 1}>上一页</button>
                                                <span>{rp.page} / {rp.totalPages}</span>
                                                <button onClick={() => goRepliesPage(c.id, rp.page + 1)} disabled={rp.page >= rp.totalPages}>下一页</button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* 评论分页 */}
                {totalComments > commentsPerPage && (
                    <div className="comments-pagination">
                        <button onClick={() => goCommentsPage(commentsPage - 1)} disabled={commentsPage <= 1}>上一页</button>
                        <span>{commentsPage} / {commentsTotalPages}</span>
                        <button onClick={() => goCommentsPage(commentsPage + 1)} disabled={commentsPage >= commentsTotalPages}>下一页</button>
                    </div>
                )}
            </div>
        </section>
    );
}
