import React from 'react';
import './SearchResults.css';

interface SearchNote {
    id: number;
    title: string;
    subject?: string;
    tags: string[];
    author: {
        name: string;
        username?: string;
    };
    created_at: string;
    attachments: any[];
}

interface SearchResultsProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    results: SearchNote[];
    isLoading: boolean;
    onNoteClick: (note: SearchNote) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ 
    isOpen, 
    onClose, 
    searchQuery, 
    results, 
    isLoading,
    onNoteClick 
}) => {
    if (!isOpen) return null;

    const getSubjectDotClass = (subject: string) => {
        switch (subject?.toLowerCase()) {
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="search-results-overlay" onClick={onClose}>
            <div className="search-results" onClick={(e) => e.stopPropagation()}>
                <div className="search-results-header">
                    <h2 className="search-results-title">
                        Search Results
                        {searchQuery && <span className="search-query"> for "{searchQuery}"</span>}
                    </h2>
                    <button
                        onClick={onClose}
                        className="search-results-close"
                        aria-label="Close search results"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="search-results-content">
                    {isLoading ? (
                        <div className="search-loading">
                            <div className="loading-spinner"></div>
                            <p>Searching notes...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="search-empty">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <h3>No notes found</h3>
                            <p>Try a different search term or browse public notes</p>
                        </div>
                    ) : (
                        <>
                            <div className="search-results-count">
                                Found {results.length} {results.length === 1 ? 'note' : 'notes'}
                            </div>
                            <div className="search-results-grid">
                                {results.map((note) => (
                                    <div
                                        key={note.id}
                                        className="search-result-card"
                                        onClick={() => onNoteClick(note)}
                                    >
                                        <div className="result-card-header">
                                            <h3 className="result-card-title">{note.title}</h3>
                                            {note.subject && (
                                                <div className="result-card-subject">
                                                    <div className={getSubjectDotClass(note.subject)}></div>
                                                    <span>{note.subject}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="result-card-meta">
                                            <div className="result-author">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="12" cy="7" r="4"></circle>
                                                </svg>
                                                <span>{note.author.name}</span>
                                            </div>
                                            <span className="result-date">{formatDate(note.created_at)}</span>
                                        </div>

                                        {note.tags && note.tags.length > 0 && (
                                            <div className="result-card-tags">
                                                {note.tags.map((tag, index) => (
                                                    <span key={index} className="result-tag">{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {note.attachments && note.attachments.length > 0 && (
                                            <div className="result-attachments">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                                </svg>
                                                <span>{note.attachments.length} {note.attachments.length === 1 ? 'attachment' : 'attachments'}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchResults;
