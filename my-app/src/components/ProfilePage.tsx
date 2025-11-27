import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import HexagonBackground from './HexagonBackground';
import NotesPopup from './NotesPopup';
import QuestionPopup from './QuestionPopup';
import CommentsPopup from './CommentsPopup';
import NoteEditor from './NoteEditor';
import NoteViewer from './NoteViewer';
import PostDetailPopup from './PostDetailPopup';
import type { Post } from '../types/post';

const API_BASE_URL = 'http://localhost:8000';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showHonorPopup, setShowHonorPopup] = useState(false);
    const [showFollowersPopup, setShowFollowersPopup] = useState(false);
    const [showFollowingPopup, setShowFollowingPopup] = useState(false);
    const [showNotesPopup, setShowNotesPopup] = useState(false);
    const [showQuestionsPopup, setShowQuestionsPopup] = useState(false);
    const [showCommentsPopup, setShowCommentsPopup] = useState(false);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [editingNote, setEditingNote] = useState<any>(null);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
    const [isPostDetailOpen, setIsPostDetailOpen] = useState(false);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [interactedPosts, setInteractedPosts] = useState<Post[]>([]);
    const [userId, setUserId] = useState<number | null>(null);
    const [userStats, setUserStats] = useState({ posts: 0, comments: 0 });
    const [profileData, setProfileData] = useState({
        name: 'John Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        bio: '',
        university: '',
        year: '',
        speciality: '',
        avatarUrl: null as string | null,
        honorLevel: 3
    });

    const [editData, setEditData] = useState(profileData);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchUserPosts();
            fetchInteractedPosts();
        }
    }, [userId]);

    const fetchUserProfile = async () => {
        try {
            const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
                credentials: 'include'
            });
            if (!userResponse.ok) throw new Error('Failed to fetch user');
            const userData = await userResponse.json();
            setUserId(userData.id);

            try {
                const profileResponse = await fetch(`${API_BASE_URL}/profiles/me`, {
                    credentials: 'include'
                });
                if (profileResponse.ok) {
                    const profile = await profileResponse.json();
                    const newProfile = {
                        name: userData.name || 'User',
                        email: userData.email,
                        username: profile.username || 'user',
                        bio: profile.bio || '',
                        university: profile.university || '',
                        year: profile.year || '',
                        speciality: profile.specialty || '',
                        avatarUrl: profile.avatar_url || null,
                        honorLevel: 3
                    };
                    setProfileData(newProfile);
                    setEditData(newProfile);
                }
            } catch (err) {
                console.error('Profile fetch failed:', err);
            }

            try {
                const statsResponse = await fetch(`${API_BASE_URL}/users/me/stats`, {
                    credentials: 'include'
                });
                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    setUserStats(stats);
                }
            } catch (err) {
                console.error('Stats fetch failed:', err);
            }
        } catch (err) {
            console.error('User fetch failed:', err);
        }
    };

    const fetchUserPosts = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/posts?author_id=${userId}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch posts');
            const posts = await response.json();
            setUserPosts(posts);
        } catch (err) {
            console.error('Failed to load user posts:', err);
        }
    };

    const fetchInteractedPosts = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/posts`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch posts');
            const allPosts = await response.json();
            const interacted = allPosts.filter((post: Post) => 
                post.liked_by_user || post.author_id === userId
            );
            setInteractedPosts(interacted);
        } catch (err) {
            console.error('Failed to load interacted posts:', err);
        }
    };

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

    const handleOpenEdit = () => {
        // initialize edit form with current profile data then open modal
        setEditData(profileData);
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/profiles/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: editData.name,
                    username: editData.username,
                    year: editData.year,
                    specialty: editData.speciality,
                    bio: editData.bio,
                    avatar_url: editData.avatarUrl
                })
            });
            if (response.ok) {
                setProfileData(editData);
                setIsEditing(false);
            } else {
                console.error('Failed to update profile');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
        }
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

    // Note editor handlers
    const handleCreateNote = () => {
        setEditingNote(null);
        setShowNoteEditor(true);
    };

    const handleEditNote = (note: any) => {
        setEditingNote(note);
        setShowNoteEditor(true);
    };

    const handleSaveNote = (note: any) => {
        // TODO: Implement note saving logic (API call)
        console.log('Saving note:', note);
        setShowNoteEditor(false);
        setEditingNote(null);
    };

    const handleCloseNoteEditor = () => {
        setShowNoteEditor(false);
        setEditingNote(null);
    };

    const handleViewNote = (note: any) => {
        // Create a detailed note object for viewing
        const detailedNote = {
            ...note,
            content: `<h2>Introduction</h2>
<p>This is the content of ${note.title.toLowerCase()}. In a real application, this content would come from your backend database.</p>

<h3>Key Points</h3>
<ul>
  <li>Important concept #1</li>
  <li>Important concept #2</li>
  <li>Important concept #3</li>
</ul>

<blockquote>This is a relevant quote that adds value to the discussion and provides additional context.</blockquote>

<h3>Implementation Details</h3>
<p>When implementing this concept, consider the following code example:</p>

<pre><code>function example() {
  const data = fetchData();
  return data.map(item => ({
    id: item.id,
    name: item.name,
    processed: true
  }));
}</code></pre>

<p>Make sure to follow best practices for optimal results.</p>`,
            author: {
                name: profileData.name,
                username: profileData.username,
                honorLevel: profileData.honorLevel
            },
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            views: Math.floor(Math.random() * 500) + 50,
            likes: Math.floor(Math.random() * 50) + 5,
            tags: note.subject ? [note.subject.toLowerCase()] : [],
            attachments: []
        };
        
        setSelectedNote(detailedNote);
        setIsNoteViewerOpen(true);
    };

    const closeNoteViewer = () => {
        setIsNoteViewerOpen(false);
        setSelectedNote(null);
    };

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
                                
                                {(profileData.university || profileData.year || profileData.speciality) && (
                                    <div className="academic-info">
                                        {profileData.university && (
                                            <div className="academic-item">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                                </svg>
                                                <span>{profileData.university}</span>
                                            </div>
                                        )}
                                        {profileData.year && (
                                            <div className="academic-item">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                                </svg>
                                                <span>{profileData.year}</span>
                                            </div>
                                        )}
                                        {profileData.speciality && (
                                            <div className="academic-item">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                                </svg>
                                                <span>{profileData.speciality}</span>
                                            </div>
                                        )}
                                    </div>
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
                                    onClick={handleOpenEdit}
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
                                        <div className="stat-value">{userStats.posts}</div>
                                        <div className="stat-label">questions</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-value">{userStats.comments}</div>
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
                                    onClick={handleCreateNote}
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
                                    <div 
                                        key={note.id} 
                                        className="note-card"
                                        onClick={() => handleViewNote(note)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="note-header">
                                            <div className="note-header-left">
                                                <div className="note-title">
                                                    {note.title}
                                                </div>
                                                <span className="note-visibility">{note.visibility}</span>
                                            </div>
                                            <div className="note-actions">
                                                <button 
                                                    className="note-edit-btn" 
                                                    onClick={(e) => { e.stopPropagation(); handleEditNote(note); }}
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
                                        <p className="note-description">
                                            {note.description}
                                        </p>
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

                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Questions</h2>
                            </div>
                            <div className="list-container">
                                {userPosts.length === 0 ? (
                                    <div className="empty-state">No questions yet</div>
                                ) : (
                                    userPosts.map(post => (
                                        <div 
                                            key={post.id} 
                                            className="list-item"
                                            onClick={() => {
                                                setSelectedPostId(post.id);
                                                setIsPostDetailOpen(true);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="item-title">{post.title}</div>
                                            <div className="item-meta">
                                                <span className="badge">{post.likes} likes</span>
                                                <span className="badge">{post.comment_count} comments</span>
                                                <span className="badge">{post.views} views</span>
                                                <span className="muted">{new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button
                                className="see-all-btn"
                                onClick={() => setShowQuestionsPopup(true)}
                            >
                                See all my questions
                            </button>
                        </div>

                        {/* Interacted Posts Section */}
                        <div className="content-section">
                            <div className="section-header">
                                <h2 className="section-title">Posts I've interacted with</h2>
                            </div>
                            <div className="list-container">
                                {interactedPosts.length === 0 ? (
                                    <div className="empty-state">No interactions yet</div>
                                ) : (
                                    interactedPosts.slice(0, 5).map(post => (
                                        <div 
                                            key={post.id} 
                                            className="list-item"
                                            onClick={() => {
                                                setSelectedPostId(post.id);
                                                setIsPostDetailOpen(true);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="item-title">{post.title}</div>
                                            <div className="item-meta">
                                                {post.liked_by_user && <span className="badge liked">❤️ Liked</span>}
                                                <span className="badge">{post.likes} likes</span>
                                                <span className="badge">{post.comment_count} comments</span>
                                                <span className="muted">by @{post.author_name}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
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
                onEditNote={handleEditNote}
                onViewNote={handleViewNote}
            />

            {/* Questions Popup */}
            <QuestionPopup
                isOpen={showQuestionsPopup}
                onClose={() => setShowQuestionsPopup(false)}
                questions={userPosts.map(post => ({
                    id: post.id,
                    title: post.title,
                    timestamp: new Date(post.created_at).toLocaleDateString(),
                    votes: post.likes,
                    answers: post.comment_count
                }))}
            />            {/* Comments Popup */}
            <CommentsPopup 
                isOpen={showCommentsPopup}
                onClose={() => setShowCommentsPopup(false)}
                comments={userComments}
            />

            {/* Note Editor */}
            <NoteEditor 
                isOpen={showNoteEditor}
                onClose={handleCloseNoteEditor}
                onSave={handleSaveNote}
                existingNote={editingNote}
                mode={editingNote ? 'edit' : 'create'}
            />

            {/* Note Viewer */}
            <NoteViewer
                isOpen={isNoteViewerOpen}
                onClose={closeNoteViewer}
                note={selectedNote}
            />

            {/* Edit Profile Modal */}
            {isEditing && (
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
                                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
                                        <path d="m5.738 9.262l3 3" stroke="currentColor" strokeWidth="0.75"/>
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

            <PostDetailPopup
                isOpen={isPostDetailOpen}
                onClose={() => {
                    setIsPostDetailOpen(false);
                    setSelectedPostId(null);
                    fetchUserPosts();
                    fetchInteractedPosts();
                }}
                postId={selectedPostId}
            />
        </div>
    );
};

export default ProfilePage;