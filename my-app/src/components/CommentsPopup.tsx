import React from 'react';
import './CommentsPopup.css';

interface Comment {
    id: number;
    content: string;
    timestamp: string;
    postTitle?: string;
    postType?: 'note' | 'question' | 'discussion';
    subject?: string;
    likes?: number;
    replies?: number;
    isEdited?: boolean;
}

interface CommentsPopupProps {
    isOpen: boolean;
    onClose: () => void;
    comments: Comment[];
}

const CommentsPopup: React.FC<CommentsPopupProps> = ({ isOpen, onClose, comments }) => {
    if (!isOpen) return null;

    const getPostTypeIcon = (type: string = 'note') => {
        switch (type) {
            case 'question':
                return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="currentColor"/>
                        <path d="M8 5.5c-.83 0-1.5.67-1.5 1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M8 8.5V9" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                );
            case 'discussion':
                return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414l-2.707 2.707A1 1 0 0 1 0 13V2a1 1 0 0 1 1-1h13z" stroke="currentColor" strokeWidth="1" fill="none"/>
                        <circle cx="4" cy="6" r="1" fill="currentColor"/>
                        <circle cx="8" cy="6" r="1" fill="currentColor"/>
                        <circle cx="12" cy="6" r="1" fill="currentColor"/>
                    </svg>
                );
            default: // note
                return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M14 2.5a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0 0 1h4.793L2.146 13.146a.5.5 0 0 0 .708.708L13 3.707V8.5a.5.5 0 0 0 1 0v-6z" fill="currentColor"/>
                    </svg>
                );
        }
    };

    const getSubjectDotClass = (subject: string = '') => {
        switch (subject.toLowerCase()) {
            case 'mathematics':
                return 'subject-dot mathematics';
            case 'physics':
                return 'subject-dot physics';
            case 'chemistry':
                return 'subject-dot chemistry';
            case 'biology':
                return 'subject-dot biology';
            case 'computer science':
                return 'subject-dot computer-science';
            case 'economics':
                return 'subject-dot economics';
            case 'psychology':
                return 'subject-dot psychology';
            case 'history':
                return 'subject-dot history';
            case 'literature':
                return 'subject-dot literature';
            case 'engineering':
                return 'subject-dot engineering';
            case 'medicine':
                return 'subject-dot medicine';
            case 'law':
                return 'subject-dot law';
            default:
                return 'subject-dot';
        }
    };

    // Add some additional mock comments for demonstration
    const allComments = [
        ...comments,
        {
            id: 5,
            content: 'This integration technique really cleared up my confusion about partial fractions. The step-by-step approach is perfect!',
            timestamp: '1 week ago',
            postTitle: 'Calculus II - Integration Techniques',
            postType: 'note' as const,
            subject: 'Mathematics',
            likes: 8,
            replies: 2,
            isEdited: false
        },
        {
            id: 6,
            content: 'Have you considered adding more practice problems? I think it would help solidify these concepts.',
            timestamp: '1 week ago',
            postTitle: 'How do you solve differential equations with separation of variables?',
            postType: 'question' as const,
            subject: 'Mathematics',
            likes: 3,
            replies: 1,
            isEdited: false
        },
        {
            id: 7,
            content: 'The diagram showing cellular structures is incredibly helpful. Could you add more about mitochondrial function?',
            timestamp: '2 weeks ago',
            postTitle: 'Cell Biology - Mitosis & Meiosis',
            postType: 'note' as const,
            subject: 'Biology',
            likes: 5,
            replies: 0,
            isEdited: true
        },
        {
            id: 8,
            content: 'Great discussion point! I think the supply curve shifts are more complex than initially presented though.',
            timestamp: '2 weeks ago',
            postTitle: 'Market Economics Discussion',
            postType: 'discussion' as const,
            subject: 'Economics',
            likes: 12,
            replies: 4,
            isEdited: false
        },
        {
            id: 9,
            content: 'This mechanism explanation is spot on! The electron pushing arrows really help visualize the process.',
            timestamp: '3 weeks ago',
            postTitle: 'Organic Chemistry Mechanisms',
            postType: 'note' as const,
            subject: 'Chemistry',
            likes: 6,
            replies: 1,
            isEdited: false
        },
        {
            id: 10,
            content: 'I disagree with the interpretation of quantum superposition here. The Copenhagen interpretation suggests...',
            timestamp: '3 weeks ago',
            postTitle: 'Understanding quantum mechanics - wave-particle duality?',
            postType: 'question' as const,
            subject: 'Physics',
            likes: 15,
            replies: 7,
            isEdited: true
        }
    ];

    return (
        <div className="comments-popup-overlay" onClick={onClose}>
            <div className="comments-popup" onClick={(e) => e.stopPropagation()}>
                <div className="comments-popup-header">
                    <h2 className="comments-popup-title">All My Comments</h2>
                    <div className="comments-popup-stats">
                        <span className="comments-count">{allComments.length} comments</span>
                        <div className="comments-filter">
                            <select className="filter-select">
                                <option value="all">All comments</option>
                                <option value="notes">On notes</option>
                                <option value="questions">On questions</option>
                                <option value="discussions">On discussions</option>
                            </select>
                            <select className="sort-select">
                                <option value="recent">Recently posted</option>
                                <option value="likes">Most liked</option>
                                <option value="replies">Most replies</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="comments-popup-close"
                        aria-label="Close popup"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div className="comments-popup-content">
                    <div className="comments-list-popup">
                        {allComments.map((comment) => (
                            <div key={comment.id} className="comment-card-popup">
                                <div className="comment-card-header">
                                    <div className="comment-post-info">
                                        <div className="post-type-icon">
                                            {getPostTypeIcon(comment.postType)}
                                        </div>
                                        <div className="post-details">
                                            <span className="post-title">{comment.postTitle}</span>
                                            <span className="post-type-label">{comment.postType || 'note'}</span>
                                        </div>
                                    </div>
                                    <div className="comment-actions">
                                        <button className="comment-action-btn" aria-label="Edit comment">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
                                                <path d="m5.738 9.262l3 3" stroke="currentColor" strokeWidth="0.75"/>
                                            </svg>
                                        </button>
                                        <button className="comment-action-btn" aria-label="More options">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
                                                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                                                <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="comment-content-popup">
                                    {comment.content}
                                    {comment.isEdited && <span className="edited-indicator">(edited)</span>}
                                </div>

                                <div className="comment-stats-popup">
                                    <div className="comment-engagement">
                                        <div className="stat-item">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M8 1l2.5 5 5.5.5-4 4 1 5.5L8 13l-5 2.5 1-5.5-4-4 5.5-.5L8 1z" stroke="currentColor" strokeWidth="1" fill="none"/>
                                            </svg>
                                            <span>{comment.likes || 0} likes</span>
                                        </div>
                                        <div className="stat-item">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414l-2.707 2.707A1 1 0 0 1 0 13V2a1 1 0 0 1 1-1h13z" stroke="currentColor" strokeWidth="1" fill="none"/>
                                            </svg>
                                            <span>{comment.replies || 0} replies</span>
                                        </div>
                                    </div>
                                    <span className="comment-timestamp">{comment.timestamp}</span>
                                </div>

                                <div className="comment-meta-popup">
                                    {comment.subject && (
                                        <div className="comment-subject-popup">
                                            <div className={getSubjectDotClass(comment.subject)}></div>
                                            <span>{comment.subject}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentsPopup;