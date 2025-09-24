import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import HexagonBackground from './HexagonBackground';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        name: 'John Doe',
        email: 'john.doe@example.com',
        username: 'johndoe'
    });

    const [editData, setEditData] = useState(profileData);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        setProfileData(editData);
        setIsEditing(false);
        console.log('Profile updated:', editData);
    };

    const handleCancel = () => {
        setEditData(profileData);
        setIsEditing(false);
    };

    const clearField = (field: string) => {
        setEditData(prev => ({
            ...prev,
            [field]: ''
        }));
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    // Mock data for notes (similar to GitHub repos)
    const publicNotes = [
        {
            id: 1,
            title: 'react-notes',
            description: 'A comprehensive note-taking app built with React and TypeScript',
            language: 'javascript',
            visibility: 'Public'
        },
        {
            id: 2,
            title: 'design-patterns',
            description: 'Collection of common design patterns with examples and explanations',
            language: 'markdown',
            visibility: 'Public'
        },
        {
            id: 3,
            title: 'api-documentation',
            description: 'REST API documentation and best practices guide',
            language: 'markdown',
            visibility: 'Public'
        },
        {
            id: 4,
            title: 'python-algorithms',
            description: 'Implementation of various algorithms and data structures in Python',
            language: 'python',
            visibility: 'Public'
        }
    ];

    // Mock data for posts
    const userPosts = [
        {
            id: 1,
            content: 'Just published a new note on React design patterns! Really excited to share what I\'ve learned about component composition and state management.',
            timestamp: '2 hours ago',
            likes: 12,
            comments: 3
        },
        {
            id: 2,
            content: 'Working on a comprehensive guide to API design. What are some common mistakes you\'ve seen in REST APIs?',
            timestamp: '1 day ago',
            likes: 8,
            comments: 7
        },
        {
            id: 3,
            content: 'Love how this community shares knowledge so freely. Thanks to everyone who contributed to my Python algorithms collection!',
            timestamp: '3 days ago',
            likes: 24,
            comments: 5
        }
    ];

    return (
        <div className="profile-container">
            <HexagonBackground />
            <button
                onClick={() => navigate('/')}
                className="close-btn"
                aria-label="Close"
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </button>

            <div className="profile-content">
                <div className="profile-layout">
                    {/* Left sidebar */}
                    <div className="profile-sidebar">
                        {!isEditing ? (
                            <>
                                <div className="profile-avatar">
                                    {getInitials(profileData.name)}
                                </div>
                                <div className="profile-name">{profileData.name}</div>
                                <div className="profile-username">@{profileData.username}</div>

                                <div className="profile-stats">
                                    <div className="stat-item">
                                        <span className="stat-number">4</span>
                                        <span>followers</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-number">3</span>
                                        <span>following</span>
                                    </div>
                                    <div className="honor-level">
                                        <div className="honor-badge">7</div>
                                        <span>honor lvl</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="edit-profile-btn"
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"
                                              fill="currentColor"/>
                                        <path d="m5.738 9.262l3 3"
                                              stroke="currentColor" strokeWidth="0.75"/>
                                    </svg>
                                    Edit profile
                                </button>
                            </>
                        ) : (
                            <div className="edit-form">
                                <div className="form-group">
                                    <label htmlFor="name">Name</label>
                                    <div className="input-wrapper">
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={editData.name}
                                            onChange={handleInputChange}
                                            placeholder="Enter your full name"
                                        />
                                        <button
                                            type="button"
                                            className="clear-btn"
                                            onClick={() => clearField('name')}
                                        >
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="username">Username</label>
                                    <div className="input-wrapper">
                                        <input
                                            type="text"
                                            id="username"
                                            name="username"
                                            value={editData.username}
                                            onChange={handleInputChange}
                                            placeholder="Enter your username"
                                        />
                                        <button
                                            type="button"
                                            className="clear-btn"
                                            onClick={() => clearField('username')}
                                        >
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button onClick={handleSave} className="save-btn">
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M10.5 3.5L4.5 9.5L1.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Save
                                    </button>
                                    <button onClick={handleCancel} className="cancel-btn">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main content */}
                    <div className="profile-main">
                        {/* Public Notes Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Public notes</h2>
                            </div>
                            <div className="notes-grid">
                                {publicNotes.map(note => (
                                    <div key={note.id} className="note-card">
                                        <div className="note-header">
                                            <a href="#" className="note-title">{note.title}</a>
                                            <span className="note-visibility">{note.visibility}</span>
                                        </div>
                                        <p className="note-description">{note.description}</p>
                                        <div className="note-meta">
                                            <div className="note-language">
                                                <span className={`language-dot ${note.language}`}></span>
                                                <span>{note.language.charAt(0).toUpperCase() + note.language.slice(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => console.log('See all notes - backend implementation needed')}
                            >
                                See all public notes
                            </button>
                        </div>

                        {/* Posts Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Recent posts</h2>
                            </div>
                            <div className="posts-container">
                                {userPosts.map(post => (
                                    <div key={post.id} className="post-card">
                                        <div className="post-header">
                                            <div className="post-avatar">
                                                {getInitials(profileData.name)}
                                            </div>
                                            <div className="post-info">
                                                <div className="post-author">{profileData.name}</div>
                                                <div className="post-time">{post.timestamp}</div>
                                            </div>
                                        </div>
                                        <div className="post-content">
                                            {post.content}
                                        </div>
                                        <div className="post-actions">
                                            <div className="post-action">
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                    <path d="M7 12.88l-.61-.55C2.38 8.85.8 7.43.8 5.65a2.85 2.85 0 0 1 5.35-1.42A2.85 2.85 0 0 1 11.5 5.65c0 1.78-1.58 3.2-5.59 6.68L7 12.88z"
                                                          fill="none" stroke="currentColor" strokeWidth="0.8"/>
                                                </svg>
                                                <span>{post.likes}</span>
                                            </div>
                                            <div className="post-action">
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                    <path d="M12 1H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1.5l1.5 2 1.5-2H12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"
                                                          fill="none" stroke="currentColor" strokeWidth="0.8"/>
                                                </svg>
                                                <span>{post.comments}</span>
                                            </div>
                                            <div className="post-action">
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                    <path d="M4 9l5-5m0 0v4m0-4H5"
                                                          stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                <span>Share</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => console.log('See all posts - backend implementation needed')}
                            >
                                See all posts
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;