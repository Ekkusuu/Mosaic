import React, { useState } from 'react';
import './CreatePostPopup.css';
import type { Post } from '../types/post';

interface CreatePostPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onPostCreated?: (post: Post) => void;
}

const CreatePostPopup: React.FC<CreatePostPopupProps> = ({ isOpen, onClose, onPostCreated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [contentError, setContentError] = useState<string | null>(null);
    const [tagError, setTagError] = useState<string | null>(null);

    if (!isOpen) return null;

    const validateTitle = (value: string) => {
        if (!value.trim()) {
            setTitleError('Question title cannot be empty');
            return false;
        }
        if (value.trim().length < 15) {
            setTitleError('Question title must be at least 15 characters');
            return false;
        }
        if (value.trim().length > 500) {
            setTitleError('Question title cannot exceed 500 characters');
            return false;
        }
        setTitleError(null);
        return true;
    };

    const validateContent = (value: string) => {
        if (!value.trim()) {
            setContentError('Question details cannot be empty');
            return false;
        }
        if (value.trim().length < 30) {
            setContentError('Question details must be at least 30 characters');
            return false;
        }
        if (value.trim().length > 50000) {
            setContentError('Question details cannot exceed 50000 characters');
            return false;
        }
        setContentError(null);
        return true;
    };

    const validateTags = (tagList: string[]) => {
        if (tagList.length === 0) {
            setTagError('At least one tag is required');
            return false;
        }
        if (tagList.length > 5) {
            setTagError('Maximum 5 tags allowed');
            return false;
        }
        setTagError(null);
        return true;
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            
            const normalizedTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
            
            if (!/^[a-z0-9\-]+$/.test(normalizedTag)) {
                setTagError('Tags can only contain lowercase letters, numbers, and hyphens');
                return;
            }
            
            if (normalizedTag.length > 50) {
                setTagError('Each tag cannot exceed 50 characters');
                return;
            }
            
            if (tags.includes(normalizedTag)) {
                setTagError('Tag already added');
                return;
            }
            
            if (tags.length >= 5) {
                setTagError('Maximum 5 tags allowed');
                return;
            }
            
            setTags([...tags, normalizedTag]);
            setTagInput('');
            setTagError(null);
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
        setTagError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const isTitleValid = validateTitle(title);
        const isContentValid = validateContent(content);
        const isTagsValid = validateTags(tags);

        if (!isTitleValid || !isContentValid || !isTagsValid) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('http://localhost:8000/posts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // This sends the HTTP-only cookie
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    tags: tags
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create post');
            }

            const newPost: Post = await response.json();

            setTitle('');
            setContent('');
            setTags([]);
            setTagInput('');
            
            if (onPostCreated) {
                onPostCreated(newPost);
            }
            
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while creating the post');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setTitle('');
            setContent('');
            setTags([]);
            setTagInput('');
            setError(null);
            setTitleError(null);
            setContentError(null);
            setTagError(null);
            onClose();
        }
    };

    return (
        <div className="create-post-overlay" onClick={handleClose}>
            <div className="create-post-popup" onClick={(e) => e.stopPropagation()}>
                <div className="create-post-header">
                    <h2 className="create-post-title">Ask a Question</h2>
                    <button 
                        onClick={handleClose} 
                        className="create-post-close-btn"
                        disabled={isSubmitting}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="create-post-error">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="create-post-form">
                    <div className="form-group">
                        <label htmlFor="post-title" className="form-label">
                            What is your question?
                        </label>
                        <input
                            id="post-title"
                            type="text"
                            className={`form-input ${titleError ? 'input-error' : ''}`}
                            placeholder="e.g., How do I solve quadratic equations using the quadratic formula?"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (titleError) validateTitle(e.target.value);
                            }}
                            onBlur={(e) => validateTitle(e.target.value)}
                            disabled={isSubmitting}
                            maxLength={500}
                        />
                        <div className="form-helper">
                            {titleError ? (
                                <span className="error-text">{titleError}</span>
                            ) : (
                                <span className="char-count">{title.length}/500</span>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="post-content" className="form-label">
                            Describe your question in detail
                        </label>
                        <textarea
                            id="post-content"
                            className={`form-textarea ${contentError ? 'input-error' : ''}`}
                            placeholder="Provide context, what you've tried, and what specifically you're stuck on..."
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value);
                                if (contentError) validateContent(e.target.value);
                            }}
                            onBlur={(e) => validateContent(e.target.value)}
                            disabled={isSubmitting}
                            rows={8}
                            maxLength={50000}
                        />
                        <div className="form-helper">
                            {contentError ? (
                                <span className="error-text">{contentError}</span>
                            ) : (
                                <span className="char-count">{content.length}/50000</span>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="post-tags" className="form-label">
                            Add tags (up to 5)
                        </label>
                        <div className="tags-input-container">
                            {tags.map((tag) => (
                                <span key={tag} className="tag-item">
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="tag-remove"
                                        disabled={isSubmitting}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            <input
                                id="post-tags"
                                type="text"
                                className="tags-input"
                                placeholder={tags.length === 0 ? "e.g., calculus, physics, homework" : ""}
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                disabled={isSubmitting || tags.length >= 5}
                            />
                        </div>
                        {tagError && <div className="form-helper"><span className="error-text">{tagError}</span></div>}
                        {!tagError && (
                            <div className="form-hint">
                                Press Enter to add a tag. Tags help others find your question.
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="btn-cancel"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Posting...' : 'Post Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePostPopup;
