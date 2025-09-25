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
        username: 'johndoe',
        bio: '',
        university: '',
        year: '',
        speciality: '',
        avatarUrl: null as string | null
    });

    const [editData, setEditData] = useState(profileData);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setEditData(prev => ({
                    ...prev,
                    avatarUrl: result
                }));
            };
            reader.readAsDataURL(file);
        }
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

    // Mock data for questions
    const userQuestions = [
        { id: 1, title: 'How do I structure large note collections?', timestamp: '2 hours ago', votes: 4, answers: 2 },
        { id: 2, title: 'Best way to sync notes across devices?', timestamp: '1 day ago', votes: 7, answers: 5 },
        { id: 3, title: 'Capturing code snippets with formatting', timestamp: '3 days ago', votes: 3, answers: 1 }
    ];

    // Mock data for comments
    const userComments = [
        { id: 1, content: 'Great tip on using tags to filter study sessions!', timestamp: '5 hours ago' },
        { id: 2, content: 'I prefer markdown for speed; templates help a lot.', timestamp: '2 days ago' },
        { id: 3, content: 'Would be nice to export as PDF with a TOC.', timestamp: '4 days ago' }
    ];

    // Mock data for tags
    const userTags: string[] = ['react', 'typescript', 'productivity'];

    // Mock activity data: posts per month for the last 12 months
    // Activity combines notes created, questions asked, comments written (mocked)
    const activityData = [3, 5, 2, 7, 6, 4, 8, 9, 5, 10, 6, 12];

    const maxActivity = Math.max(...activityData, 1);

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
                                    {profileData.avatarUrl ? (
                                        <img src={profileData.avatarUrl} alt={profileData.name} />
                                    ) : (
                                        getInitials(profileData.name)
                                    )}
                                </div>
                                <div className="profile-name">{profileData.name}</div>
                                <div className="profile-username">@{profileData.username}</div>
                                {profileData.bio && (
                                    <div className="profile-bio">{profileData.bio}</div>
                                )}

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
                            <div className="edit-modal-overlay" onClick={handleCancel}>
                                <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                                    <div className="form-header">
                                        <div className="form-title">Edit profile</div>
                                        <div className="form-subtitle">Highlight what helps others discover your notes</div>
                                        <button onClick={handleCancel} className="modal-close-btn">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                        </button>
                                    </div>

                                <div className="avatar-upload">
                                    <div className="avatar-preview">
                                        {editData.avatarUrl ? (
                                            <img src={editData.avatarUrl} alt="Profile" />
                                        ) : (
                                            <span>{getInitials(editData.name)}</span>
                                        )}
                                    </div>
                                    <label className="upload-btn">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} />
                                        Change avatar
                                    </label>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="name">Name</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={editData.name}
                                                onChange={handleInputChange}
                                                placeholder="Your full name"
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
                                                placeholder="Unique handle"
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

                                    <div className="form-group">
                                        <label htmlFor="year">Year</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                id="year"
                                                name="year"
                                                value={editData.year}
                                                onChange={handleInputChange}
                                                placeholder="e.g., 2nd year"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="speciality">Speciality</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                id="speciality"
                                                name="speciality"
                                                value={editData.speciality}
                                                onChange={handleInputChange}
                                                placeholder="Your field of study"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group full">
                                        <label htmlFor="bio">Bio</label>
                                        <div className="input-wrapper">
                                            <textarea
                                                id="bio"
                                                name="bio"
                                                value={editData.bio}
                                                onChange={handleInputChange}
                                                placeholder="A sentence or two about you"
                                            />
                                        </div>
                                        <div className="helper-text">Keep it short and sweet.</div>
                                    </div>

                                    {null}
                                </div>

                                <div className="form-actions">
                                    <button onClick={handleSave} className="save-btn">
                                        Save
                                    </button>
                                    <button onClick={handleCancel} className="cancel-btn">
                                        Cancel
                                    </button>
                                </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main content */}
                    <div className="profile-main">
                        {/* Activity Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">My activity</h2>
                            </div>
                            <div className="activity-card">
                                <div className="activity-stats">
                                    <div className="stat">
                                        <div className="stat-value">{userQuestions.length}</div>
                                        <div className="stat-label">questions</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-value">{userComments.length}</div>
                                        <div className="stat-label">comments</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-value">{publicNotes.length}</div>
                                        <div className="stat-label">notes</div>
                                    </div>
                                </div>
                                <div className="sparkline-wrap">
                                    <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="sparkline">
                                        <polyline
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            points={activityData.map((v, i) => {
                                                const x = (i / (activityData.length - 1)) * 240;
                                                const y = 60 - (v / maxActivity) * 50 - 5;
                                                return `${x},${y}`;
                                            }).join(' ')}
                                        />
                                    </svg>
                                    <div className="sparkline-footer">last 12 months</div>
                                </div>
                            </div>
                        </div>
                        {/* My Notes Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">My notes</h2>
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
                                onClick={() => console.log('See all my notes - backend implementation needed')}
                            >
                                See all my notes
                            </button>
                        </div>

                        {/* Questions Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Questions</h2>
                            </div>
                            <div className="list-container">
                                {userQuestions.map(q => (
                                    <div key={q.id} className="list-item">
                                        <a href="#" className="item-title">{q.title}</a>
                                        <div className="item-meta">
                                            <span className="badge">{q.votes} votes</span>
                                            <span className="badge">{q.answers} answers</span>
                                            <span className="muted">{q.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => console.log('See all my questions - backend implementation needed')}
                            >
                                See all my questions
                            </button>
                        </div>

                        {/* Comments Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Comments</h2>
                            </div>
                            <div className="list-container">
                                {userComments.map(c => (
                                    <div key={c.id} className="list-item">
                                        <div className="item-body">{c.content}</div>
                                        <div className="item-meta">
                                            <span className="muted">{c.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => console.log('See all my comments - backend implementation needed')}
                            >
                                See all my comments
                            </button>
                        </div>

                        {/* Tags Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Tags</h2>
                            </div>
                            <div className="tags-container">
                                {userTags.length === 0 ? (
                                    <div className="empty-state">You have not participated in any <a href="#">tags</a></div>
                                ) : (
                                    <div className="tag-list">
                                        {userTags.map(tag => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;