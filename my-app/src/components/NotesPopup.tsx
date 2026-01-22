import React, { useState } from 'react';
import './NotesPopup.css';

interface Note {
    id: number;
    title: string;
    description: string;
    subject: string;
    visibility: string;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
    size?: string;
}

interface NotesPopupProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Note[];
    onEditNote?: (note: Note) => void;
    onViewNote?: (note: Note) => void;
    onDeleteNote?: (note: Note) => Promise<void>;
}

const NotesPopup: React.FC<NotesPopupProps> = ({ isOpen, onClose, notes, onEditNote, onViewNote, onDeleteNote }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
    
    if (!isOpen) return null;

    const handleDelete = async (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        if (!onDeleteNote) return;
        
        if (window.confirm(`Are you sure you want to delete "${note.title}"? This action cannot be undone.`)) {
            setDeletingNoteId(note.id);
            try {
                await onDeleteNote(note);
            } finally {
                setDeletingNoteId(null);
            }
        }
    };

    const getSubjectDotClass = (subject: string) => {
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    const allNotes = notes;

    return (
        <div className="notes-popup-overlay" onClick={onClose}>
            <div className="notes-popup" onClick={(e) => e.stopPropagation()}>
                <div className="notes-popup-header">
                    <h2 className="notes-popup-title">All My Notes</h2>
                    
                    <div className="notes-search-section">
                        <div className="notes-search-input-container">
                            <svg className="notes-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="notes-search-input"
                            />
                        </div>
                    </div>
                    
                    <div className="notes-popup-stats">
                        <span className="notes-count">{allNotes.length} notes</span>
                        <div className="notes-filter">
                            <select className="filter-select">
                                <option value="all">All notes</option>
                                <option value="public">Public only</option>
                                <option value="private">Private only</option>
                            </select>
                            <select className="sort-select">
                                <option value="recent">Recently updated</option>
                                <option value="name">Name</option>
                                <option value="created">Date created</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="notes-popup-close"
                        aria-label="Close popup"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div className="notes-popup-content">
                    <div className="notes-grid-popup">
                        {allNotes.map((note) => (
                            <div 
                                key={note.id} 
                                className="note-card-popup"
                                onClick={() => onViewNote && onViewNote(note)}
                                style={{ cursor: 'pointer' }}
                                title="Click to view note"
                            >
                                <div className="note-card-header">
                                    <div className="note-title-section">
                                        <h3 className="note-title-popup">
                                            {note.title}
                                        </h3>
                                        <span className={`note-visibility-popup ${note.visibility.toLowerCase()}`}>
                                            {note.visibility}
                                        </span>
                                    </div>
                                    <div className="note-actions" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            className="note-action-btn" 
                                            aria-label="Edit note"
                                            onClick={() => onEditNote && onEditNote(note)}
                                            title="Edit this note"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
                                                <path d="m5.738 9.262l3 3" stroke="currentColor" strokeWidth="0.75"/>
                                            </svg>
                                        </button>
                                        <button 
                                            className="note-action-btn note-delete-btn" 
                                            aria-label="Delete note"
                                            onClick={(e) => handleDelete(e, note)}
                                            title="Delete this note"
                                            disabled={deletingNoteId === note.id}
                                        >
                                            {deletingNoteId === note.id ? (
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="spin">
                                                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="30" strokeLinecap="round"/>
                                                </svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <path d="M6.667 7.333v4M9.333 7.333v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <p className="note-description-popup">
                                    {note.description}
                                </p>

                                <div className="note-meta-popup">
                                    <div className="note-subject-popup">
                                        <div className={getSubjectDotClass(note.subject)}></div>
                                        <span>{note.subject}</span>
                                    </div>
                                    <span className="note-date">{formatDate(note.createdAt)}</span>
                                </div>

                                {note.tags && note.tags.length > 0 && (
                                    <div className="note-tags-popup">
                                        {note.tags.map((tag, index) => (
                                            <span key={index} className="note-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotesPopup;