import React, { useEffect, useRef } from 'react';
import './NoteViewer.css';

interface Note {
    id: number;
    title: string;
    content: string;
    subject: string;
    visibility: string;
    author?: {
        name: string;
        username: string;
        honorLevel?: number;
    };
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
    attachments?: any[];
    views?: number;
    likes?: number;
}

interface NoteViewerProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note | null;
}

const NoteViewer: React.FC<NoteViewerProps> = ({ isOpen, onClose, note }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    // Convert markdown attachment syntax to HTML references for viewing
    const markdownToHtml = (markdown: string): string => {
        // Convert {attach: file="index", name="display name"} to HTML references
        return markdown.replace(/\{attach:\s*file="(\d+)"\s*,\s*name="([^"]+)"\}/g, (match, fileIndex, displayName) => {
            const index = parseInt(fileIndex);
            const attachment = note?.attachments?.[index];
            
            if (!attachment) return displayName; // Fallback to display name if attachment not found
            
            // Determine if it's an image based on filename
            const isImage = attachment.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            
            const icon = isImage ? `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                </svg>
            ` : `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
            `;
            
            const className = isImage ? 'image-reference' : 'document-reference';
            return `<span class="${className}" data-file-index="${fileIndex}" data-file-id="${attachment.id || ''}" style="cursor: pointer;">${icon}${displayName}</span>`;
        });
    };

    useEffect(() => {
        if (contentRef.current && note?.content) {
            // Convert markdown format to HTML for viewing
            const htmlContent = markdownToHtml(note.content);
            contentRef.current.innerHTML = htmlContent;
            
            // Add click handlers for references
            addReferenceClickHandlers();
        }
    }, [note]);

    const addReferenceClickHandlers = () => {
        if (!contentRef.current) return;

        const references = contentRef.current.querySelectorAll('.document-reference, .image-reference');
        references.forEach(ref => {
            ref.addEventListener('click', handleReferenceClick);
        });
    };

    const handleReferenceClick = async (e: Event) => {
        e.preventDefault();
        const reference = e.currentTarget as HTMLElement;
        const fileId = reference.getAttribute('data-file-id');
        const fileIndex = reference.getAttribute('data-file-index');
        
        if (!fileId || !fileIndex) {
            alert('File not found');
            return;
        }
        
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            const attachment = note?.attachments?.[parseInt(fileIndex)];
            
            if (!attachment) {
                alert('File not found');
                return;
            }
            
            // Fetch the file
            const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load file');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Determine file type and display accordingly
            const fileName = attachment.filename || '';
            const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i);
            const isPdf = fileName.match(/\.pdf$/i);
            const isText = fileName.match(/\.(txt|md|json|xml|html|css|js|ts|tsx|jsx|py|java|c|cpp|h|rs)$/i);
            
            // Create modal overlay for displaying the file
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
            `;
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                font-size: 32px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            `;
            closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            closeBtn.onclick = () => {
                document.body.removeChild(overlay);
                window.URL.revokeObjectURL(url);
            };
            overlay.appendChild(closeBtn);
            
            if (isImage) {
                // Display image
                const img = document.createElement('img');
                img.src = url;
                img.style.cssText = `
                    max-width: 90%;
                    max-height: 90%;
                    object-fit: contain;
                    border-radius: 8px;
                `;
                overlay.appendChild(img);
            } else if (isPdf) {
                // Display PDF
                const iframe = document.createElement('iframe');
                iframe.src = url;
                iframe.style.cssText = `
                    width: 90%;
                    height: 90%;
                    border: none;
                    border-radius: 8px;
                    background: white;
                `;
                overlay.appendChild(iframe);
            } else if (isText) {
                // Display text content
                const text = await blob.text();
                const pre = document.createElement('pre');
                pre.textContent = text;
                pre.style.cssText = `
                    max-width: 90%;
                    max-height: 90%;
                    overflow: auto;
                    background: white;
                    color: black;
                    padding: 20px;
                    border-radius: 8px;
                    font-family: monospace;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                `;
                overlay.appendChild(pre);
            } else {
                // Unsupported file type - offer download
                window.URL.revokeObjectURL(url);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                return;
            }
            
            // Close on background click
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    window.URL.revokeObjectURL(url);
                }
            };
            
            document.body.appendChild(overlay);
        } catch (error) {
            console.error('Error displaying file:', error);
            alert('Failed to display file');
        }
    };

    const handleAttachmentDownload = async (attachmentId: number, fileName: string) => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            
            // Fetch the file
            const response = await fetch(`${API_BASE_URL}/files/${attachmentId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to download file');
            }
            
            // Get the blob and create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file');
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
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatViews = (views?: number) => {
        if (!views) return '0';
        if (views >= 1000) {
            return `${(views / 1000).toFixed(1)}k`;
        }
        return views.toString();
    };

    if (!isOpen || !note) return null;

    return (
        <div className="note-viewer-overlay" onClick={onClose}>
            <div className="note-viewer" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="note-viewer-header">
                    <div className="note-header-content">
                        <h1 className="note-title">{note.title}</h1>
                        <div className="note-meta-header">
                            <div className="note-author">
                                <div className="author-info">
                                    <span className="author-name">{note.author?.name || 'Anonymous'}</span>
                                    <span className="author-username">@{note.author?.username || 'unknown'}</span>
                                    {note.author?.honorLevel && (
                                        <span className="author-honor">Level {note.author.honorLevel}</span>
                                    )}
                                </div>
                            </div>
                            <div className="note-stats">
                                <span className="note-stat">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    {formatViews(note.views)} views
                                </span>
                                <span className="note-stat">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                    {note.likes || 0} likes
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="note-viewer-close"
                        aria-label="Close note viewer"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="note-viewer-content">
                    <div className="note-content-area">
                        <div 
                            ref={contentRef}
                            className="note-content"
                        />
                    </div>

                    {/* Sidebar */}
                    <div className="note-sidebar">
                        {/* Subject */}
                        {note.subject && (
                            <div className="note-info-section">
                                <h3 className="info-title">Subject</h3>
                                <div className="note-subject">
                                    <div className={getSubjectDotClass(note.subject)}></div>
                                    <span>{note.subject}</span>
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                            <div className="note-info-section">
                                <h3 className="info-title">Tags</h3>
                                <div className="note-tags">
                                    {note.tags.map((tag, index) => (
                                        <span key={index} className="note-tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="note-info-section">
                            <h3 className="info-title">Details</h3>
                            <div className="note-dates">
                                <div className="date-item">
                                    <span className="date-label">Created:</span>
                                    <span className="date-value">{formatDate(note.createdAt)}</span>
                                </div>
                                {note.updatedAt && note.updatedAt !== note.createdAt && (
                                    <div className="date-item">
                                        <span className="date-label">Updated:</span>
                                        <span className="date-value">{formatDate(note.updatedAt)}</span>
                                    </div>
                                )}
                                <div className="date-item">
                                    <span className="date-label">Visibility:</span>
                                    <span className={`visibility-badge ${note.visibility.toLowerCase()}`}>
                                        {note.visibility}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Attachments */}
                        {note.attachments && note.attachments.length > 0 && (
                            <div className="note-info-section">
                                <h3 className="info-title">Attachments</h3>
                                <div className="note-attachments">
                                    {note.attachments.map((attachment, index) => (
                                        <div 
                                            key={index} 
                                            className="attachment-item"
                                            onClick={() => handleAttachmentDownload(attachment.id, attachment.filename || `Attachment_${index + 1}`)}
                                            style={{ cursor: 'pointer' }}
                                            title="Click to download"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="7,10 12,15 17,10"></polyline>
                                                <line x1="12" y1="15" x2="12" y2="3"></line>
                                            </svg>
                                            <span className="attachment-name">{attachment.filename || `Attachment ${index + 1}`}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="note-viewer-footer">
                    <div className="note-actions">
                        <button className="action-btn like-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            Like
                        </button>
                        <button className="action-btn share-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                            Share
                        </button>
                        <button className="action-btn bookmark-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteViewer;
