import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import HexagonBackground from './HexagonBackground';
import NotesPopup from './NotesPopup';
import QuestionPopup from './QuestionPopup';
import CommentsPopup from './CommentsPopup';
import AIChat from './AIChat';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showHonorPopup, setShowHonorPopup] = useState(false);
    const [showFollowersPopup, setShowFollowersPopup] = useState(false);
    const [showFollowingPopup, setShowFollowingPopup] = useState(false);
    const [showNotesPopup, setShowNotesPopup] = useState(false);
    const [showQuestionsPopup, setShowQuestionsPopup] = useState(false);
    const [showCommentsPopup, setShowCommentsPopup] = useState(false);
    const [profileData, setProfileData] = useState({
        name: 'John Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        bio: '',
        university: '',
        year: '',
        speciality: '',
        avatarUrl: null as string | null,
        honorLevel: 3 // Default honor level
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

    // Honor levels data
    const honorLevels = [
        {
            level: 1,
            name: 'Restricted',
            benefits: [],
            restrictions: ['Limited to 10 notes', 'No sharing capabilities', 'Basic upload limit (1MB)', 'No collaboration tools']
        },
        {
            level: 2,
            name: 'Limited',
            benefits: [],
            restrictions: ['Limited to 50 notes', 'Basic sharing only', 'Standard upload limit (5MB)', 'No advanced features']
        },
        {
            level: 3,
            name: 'Student',
            benefits: ['Full collaboration suite', 'Priority support', 'Advanced search', 'Unlimited notes'],
            restrictions: ['None']
        },
        {
            level: 4,
            name: 'Scholar',
            benefits: [
                '+ All Student benefits',
                'Premium templates', 
                'Advanced analytics', 
                'Beta features access', 
                'Priority queue'
            ],
            restrictions: ['None']
        },
        {
            level: 5,
            name: 'Master',
            benefits: [
                '+ All Scholar benefits',
                'Direct developer contact', 
                'Feature voting rights', 
                'Custom integrations',
                'Exclusive Master features'
            ],
            restrictions: ['None']
        }
    ];

    const publicNotes = [
        {
            id: 1,
            title: 'Linear Algebra - Eigenvalues',
            description: 'Comprehensive study of eigenvalues, eigenvectors, and diagonalization',
            subject: 'Mathematics',
            visibility: 'Public'
        },
        {
            id: 2,
            title: 'World War II - European Theater',
            description: 'Detailed timeline and analysis of major battles and political decisions',
            subject: 'History',
            visibility: 'Public'
        },
        {
            id: 3,
            title: 'Thermodynamics - First Law',
            description: 'Energy conservation principles and applications in various systems',
            subject: 'Physics',
            visibility: 'Public'
        },
        {
            id: 4,
            title: 'Data Structures & Algorithms',
            description: 'Implementation and analysis of trees, graphs, and sorting algorithms',
            subject: 'Computer Science',
            visibility: 'Public'
        }
    ];

    // Mock data for questions
    const userQuestions = [
        { id: 1, title: 'How do you memorize complex chemical formulas effectively?', timestamp: '2 hours ago', votes: 4, answers: 2 },
        { id: 2, title: 'Best strategies for solving calculus optimization problems?', timestamp: '1 day ago', votes: 7, answers: 5 },
        { id: 3, title: 'Understanding quantum mechanics - wave-particle duality?', timestamp: '3 days ago', votes: 3, answers: 1 }
    ];

    // Mock data for comments
    const userComments = [
        { id: 1, content: 'Great explanation of the photosynthesis cycle! Really helped with my bio exam.', timestamp: '5 hours ago' },
        { id: 2, content: 'The mnemonic for remembering historical dates is brilliant!', timestamp: '2 days ago' },
        { id: 3, content: 'Could you add more examples for the economic models section?', timestamp: '4 days ago' }
    ];

    // Mock data for tags
    const userTags: string[] = ['calculus', 'organic-chemistry', 'study-techniques'];

    // Mock data for followers
    const followers = [
        { id: 1, name: 'Alice Johnson', username: 'alicej', avatarUrl: null, bio: 'Full-stack developer passionate about React' },
        { id: 2, name: 'Bob Smith', username: 'bobsmith', avatarUrl: null, bio: 'CS student, love algorithms and data structures' },
        { id: 3, name: 'Carol Williams', username: 'carolw', avatarUrl: null, bio: 'UI/UX designer with coding skills' },
        { id: 4, name: 'David Brown', username: 'davidb', avatarUrl: null, bio: 'Backend engineer, Python enthusiast' }
    ];

    // Mock data for following
    const following = [
        { id: 1, name: 'Emma Davis', username: 'emmad', avatarUrl: null, bio: 'Tech blogger and software architect' },
        { id: 2, name: 'Frank Miller', username: 'frankm', avatarUrl: null, bio: 'Open source contributor, JavaScript expert' },
        { id: 3, name: 'Grace Wilson', username: 'gracew', avatarUrl: null, bio: 'Data scientist and machine learning researcher' }
    ];

    // Mock activity data: posts per month for the last 12 months
    // Activity combines notes created, questions asked, comments written (mocked)
    const activityData = [3, 5, 2, 7, 6, 4, 8, 9, 5, 10, 6, 12];

    const maxActivity = Math.max(...activityData, 1);
    const [showChat, setShowChat] = useState(false);

    return (
        <div className="profile-container">
            <HexagonBackground />
            <button
                onClick={() => navigate('/')}
                className="back-btn"
                aria-label="Go back"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
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
                                    <button 
                                        className="stat-item clickable"
                                        onClick={() => setShowFollowersPopup(true)}
                                    >
                                        <span className="stat-number">{followers.length}</span>
                                        <span>followers</span>
                                    </button>
                                    <button 
                                        className="stat-item clickable"
                                        onClick={() => setShowFollowingPopup(true)}
                                    >
                                        <span className="stat-number">{following.length}</span>
                                        <span>following</span>
                                    </button>
                                    <button 
                                        className="honor-level"
                                        onClick={() => setShowHonorPopup(true)}
                                    >
                                        <div className="honor-badge">{profileData.honorLevel}</div>
                                        <span>honor</span>
                                    </button>
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
                                    <label className="avatar-preview-wrapper">
                                        <div className="avatar-preview">
                                            {editData.avatarUrl ? (
                                                <img src={editData.avatarUrl} alt="Profile" />
                                            ) : (
                                                <span>{getInitials(editData.name)}</span>
                                            )}
                                        </div>
                                        <div className="avatar-edit-icon">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"
                                                      fill="currentColor"/>
                                                <path d="m5.738 9.262l3 3"
                                                      stroke="currentColor" strokeWidth="0.75"/>
                                            </svg>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="avatar-file-input" />
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
                                <button 
                                    className="create-note-btn"
                                    onClick={() => {/* TODO: Add create note functionality */}}
                                    title="Create a new note"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    New Note
                                </button>
                            </div>
                            <div className="notes-grid">
                                {publicNotes.map(note => (
                                    <div key={note.id} className="note-card">
                                        <div className="note-header">
                                            <div className="note-header-left">
                                                <a href="#" className="note-title">{note.title}</a>
                                                <span className="note-visibility">{note.visibility}</span>
                                            </div>
                                            <div className="note-actions">
                                                <button 
                                                    className="note-edit-btn" 
                                                    onClick={() => {/* TODO: Add edit note functionality */}}
                                                    aria-label="Edit note"
                                                    title="Edit this note"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
                                                        <path d="m5.738 9.262l3 3" stroke="currentColor" strokeWidth="0.75"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="note-description">{note.description}</p>
                                        <div className="note-meta">
                                            <div className="note-subject">
                                                <span className={`subject-dot ${note.subject.toLowerCase().replace(/\s+/g, '-')}`}></span>
                                                <span>{note.subject}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => setShowNotesPopup(true)}
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
                                onClick={() => setShowQuestionsPopup(true)}
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
                                onClick={() => setShowCommentsPopup(true)}
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

                        {/* AI Chat Section Toggle */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">AI Assistant</h2>
                                <button className="see-all-btn" type="button" onClick={() => setShowChat(v => !v)}>
                                    {showChat ? 'Hide chat' : 'Open chat'}
                                </button>
                            </div>
                            {showChat && (
                                <div className="ai-chat-wrapper">
                                    <AIChat />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Honor Level Popup */}
            {showHonorPopup && (
                <div className="honor-popup-overlay" onClick={() => setShowHonorPopup(false)}>
                    <div className="honor-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="honor-popup-header">
                            <h3 className="honor-popup-title">Honor Levels</h3>
                        </div>
                        <div className="honor-levels-container">
                            {honorLevels.map((honor) => (
                                <div 
                                    key={honor.level} 
                                    className={`honor-level-card ${honor.level === profileData.honorLevel ? 'current' : ''}`}
                                >
                                    <div className="honor-level-header">
                                        <div className="honor-level-badge">{honor.level}</div>
                                        <div className="honor-level-name">{honor.name}</div>
                                        {honor.level === profileData.honorLevel && (
                                            <div className="current-badge">Current</div>
                                        )}
                                    </div>
                                    <div className="honor-level-content">
                                        {honor.benefits.length > 0 && (
                                            <div className="honor-section">
                                                <h4 className="honor-section-title">Benefits</h4>
                                                <ul className="honor-list">
                                                    {honor.benefits.map((benefit, index) => (
                                                        <li key={index} className={`honor-item benefit ${benefit.startsWith('+') ? 'inherited' : ''}`}>
                                                            {benefit.startsWith('+') ? (
                                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                                </svg>
                                                            ) : (
                                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            )}
                                                            {benefit}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {honor.restrictions[0] !== 'None' && (
                                            <div className="honor-section">
                                                <h4 className="honor-section-title">Restrictions</h4>
                                                <ul className="honor-list">
                                                    {honor.restrictions.map((restriction, index) => (
                                                        <li key={index} className="honor-item restriction">
                                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                            </svg>
                                                            {restriction}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Followers Popup */}
            {showFollowersPopup && (
                <div className="follow-popup-overlay" onClick={() => setShowFollowersPopup(false)}>
                    <div className="follow-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="follow-popup-header">
                            <h3 className="follow-popup-title">Followers</h3>
                        </div>
                        <div className="follow-list">
                            {followers.map((user) => (
                                <div key={user.id} className="follow-item">
                                    <div className="follow-avatar">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} />
                                        ) : (
                                            user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                        )}
                                    </div>
                                    <div className="follow-info">
                                        <div className="follow-name">{user.name}</div>
                                        <div className="follow-username">@{user.username}</div>
                                        {user.bio && <div className="follow-bio">{user.bio}</div>}
                                    </div>
                                    <button className="follow-btn">Following</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Following Popup */}
            {showFollowingPopup && (
                <div className="follow-popup-overlay" onClick={() => setShowFollowingPopup(false)}>
                    <div className="follow-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="follow-popup-header">
                            <h3 className="follow-popup-title">Following</h3>
                        </div>
                        <div className="follow-list">
                            {following.map((user) => (
                                <div key={user.id} className="follow-item">
                                    <div className="follow-avatar">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} />
                                        ) : (
                                            user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                        )}
                                    </div>
                                    <div className="follow-info">
                                        <div className="follow-name">{user.name}</div>
                                        <div className="follow-username">@{user.username}</div>
                                        {user.bio && <div className="follow-bio">{user.bio}</div>}
                                    </div>
                                    <button className="follow-btn">Unfollow</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Notes Popup */}
            <NotesPopup 
                isOpen={showNotesPopup}
                onClose={() => setShowNotesPopup(false)}
                notes={publicNotes}
            />

            {/* Questions Popup */}
            <QuestionPopup 
                isOpen={showQuestionsPopup}
                onClose={() => setShowQuestionsPopup(false)}
                questions={userQuestions}
            />

            {/* Comments Popup */}
            <CommentsPopup 
                isOpen={showCommentsPopup}
                onClose={() => setShowCommentsPopup(false)}
                comments={userComments}
            />
        </div>
    );
};

export default ProfilePage;