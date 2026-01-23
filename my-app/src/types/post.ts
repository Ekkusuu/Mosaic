export interface Post {
  id: number;
  title: string;
  body: string;
  author_id: number;
  author_name?: string;
  tags: string[];
  views: number;
  upvotes: number;
  downvotes: number;
  user_vote: "up" | "down" | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
}
