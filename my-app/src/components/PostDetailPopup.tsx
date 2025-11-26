import React, { useState, useEffect } from 'react';
import './PostDetailPopup.css';
import type { Post } from '../types/post';

interface Comment {
    id: number;
    post_id: number;
    user_id: number;
    user_name: string;
    content: string;
    likes: number;
    liked_by_user: boolean;
    created_at: string;
    updated_at: string;
}

interface PostDetailPopupProps {
    isOpen: boolean;
    onClose: () => void;
    postId: number | null;
}

const API_BASE_URL = 'http://localhost:8000';

const PostDetailPopup: React.FC<PostDetailPopupProps> = ({ isOpen, onClose, postId }) => {
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentContent, setCommentContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shareMessage, setShareMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && postId) {
            fetchPost();
            fetchComments();
        }
    }, [isOpen, postId]);

    const fetchPost = async () => {
        if (!postId) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch post');
            const data = await response.json();
            setPost(data);
        } catch (err) {
            setError('Failed to load post');
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        if (!postId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch comments');
            const data = await response.json();
            setComments(data);
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    };

    const handleLike = async () => {
        if (!postId || !post) return;
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to like post');
            const updatedPost = await response.json();
            setPost(updatedPost);
        } catch (err) {
            console.error('Failed to like post:', err);
        }
    };

    const handleShare = async () => {
        if (!postId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/share`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to share post');
            const data = await response.json();
            setShareMessage('Post shared successfully!');
            setTimeout(() => setShareMessage(null), 3000);
            if (post) {
                setPost({ ...post, shares: data.shares });
            }
        } catch (err) {
            console.error('Failed to share post:', err);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postId || !commentContent.trim()) return;
        
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ content: commentContent.trim() })
            });
            if (!response.ok) throw new Error('Failed to post comment');
            const newComment = await response.json();
            setComments([newComment, ...comments]);
            setCommentContent('');
            if (post) {
                setPost({ ...post, comment_count: post.comment_count + 1 });
            }
        } catch (err) {
            console.error('Failed to post comment:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/posts/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to delete comment');
            setComments(comments.filter(c => c.id !== commentId));
            if (post) {
                setPost({ ...post, comment_count: Math.max(0, post.comment_count - 1) });
            }
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    const handleLikeComment = async (commentId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/posts/comments/${commentId}/like`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to like comment');
            const updatedComment = await response.json();
            setComments(comments.map(c => c.id === commentId ? updatedComment : c));
        } catch (err) {
            console.error('Failed to like comment:', err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <div className="post-detail-overlay" onClick={onClose}>
            <div className="post-detail-popup" onClick={(e) => e.stopPropagation()}>
                <div className="post-detail-header">
                    <h2>Post Details</h2>
                    <button onClick={onClose} className="close-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {shareMessage && (
                    <div className="share-message">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                        {shareMessage}
                    </div>
                )}

                <div className="post-detail-content">
                    {loading && <div className="loading">Loading...</div>}
                    {error && <div className="error-message">{error}</div>}
                    
                    {post && !loading && (
                        <>
                            <div className="post-main">
                                <div className="post-meta">
                                    <span className="post-author">{post.author_name}</span>
                                    <span className="post-date">{formatDate(post.created_at)}</span>
                                </div>
                                
                                <h1 className="post-title">{post.title}</h1>
                                
                                <div className="post-tags">
                                    {post.tags.map((tag, index) => (
                                        <span key={index} className="tag">{tag}</span>
                                    ))}
                                </div>
                                
                                <div className="post-body">{post.body}</div>
                                
                                <div className="post-stats">
                                    <span>{post.views} views</span>
                                    <span>{post.likes} likes</span>
                                    <span>{post.shares} shares</span>
                                    <span>{post.comment_count} comments</span>
                                </div>
                                
                                <div className="post-actions">
                                    <button 
                                        onClick={handleLike} 
                                        className={`action-btn ${post.liked_by_user ? 'active' : ''}`}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill={post.liked_by_user ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                            <path d="M10 17.5l-6.25-6.25c-1.25-1.25-1.25-3.5 0-4.75 1.25-1.25 3.5-1.25 4.75 0L10 8l1.5-1.5c1.25-1.25 3.5-1.25 4.75 0 1.25 1.25 1.25 3.5 0 4.75L10 17.5z"/>
                                        </svg>
                                        <span>{post.liked_by_user ? 'Liked' : 'Like'}</span>
                                    </button>
                                    
                                    <button onClick={handleShare} className="action-btn">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M15 6.67V3.33L20 8l-5 4.67V9.33H10v-2.66h5zM8 10.67V8H3v9h12v-4H8v-2.33z"/>
                                        </svg>
                                        <span>Share</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="comments-section">
                                <h3 className="comments-title">Comments ({comments.length})</h3>
                                
                                <form onSubmit={handleSubmitComment} className="comment-form">
                                    <textarea
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        placeholder="Write a comment..."
                                        disabled={submitting}
                                        maxLength={5000}
                                    />
                                    <div className="comment-form-actions">
                                        <span className="char-count">{commentContent.length}/5000</span>
                                        <button 
                                            type="submit" 
                                            disabled={submitting || !commentContent.trim()}
                                            className="submit-comment-btn"
                                        >
                                            {submitting ? 'Posting...' : 'Post Comment'}
                                        </button>
                                    </div>
                                </form>
                                
                                <div className="comments-list">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="comment-item">
                                            <div className="comment-header">
                                                <span className="comment-author">{comment.user_name}</span>
                                                <span className="comment-date">{formatDate(comment.created_at)}</span>
                                            </div>
                                            <div className="comment-content">{comment.content}</div>
                                            <div className="comment-actions">
                                                <button 
                                                    onClick={() => handleLikeComment(comment.id)}
                                                    className={`like-comment-btn ${comment.liked_by_user ? 'liked' : ''}`}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 16 16" fill={comment.liked_by_user ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                                        <path d="M8 14s-6-4.5-6-8a3 3 0 0 1 6-2 3 3 0 0 1 6 2c0 3.5-6 8-6 8z"/>
                                                    </svg>
                                                    <span>{comment.likes}</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="delete-comment-btn"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {comments.length === 0 && (
                                        <div className="no-comments">
                                            No comments yet. Be the first to comment!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostDetailPopup;