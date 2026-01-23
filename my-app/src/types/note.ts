export interface Note {
    id: number;
    title: string;
    content?: string;
    description?: string;
    subject: string;
    visibility: string;
    views: number;
    upvotes: number;
    downvotes: number;
    user_vote: 'up' | 'down' | null;
    content_file_id?: number;
    author?: {
        name: string;
        username: string;
        honorLevel?: number;
    };
    createdAt?: string;
    updatedAt?: string;
    created_at?: string;
    updated_at?: string;
    tags?: string[];
    attachments?: {
        id: number;
        filename: string;
        size?: number;
    }[];
    size?: string;
}

export interface NoteVoteResult {
    note_id: number;
    upvotes: number;
    downvotes: number;
    user_vote: 'up' | 'down' | null;
}

export interface NoteViewResult {
    note_id: number;
    views: number;
    incremented: boolean;
}
