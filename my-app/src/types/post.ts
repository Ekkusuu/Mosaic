export interface Post {
  id: number;
  title: string;
  body: string;
  author_id: number;
  author_name?: string;
  tags: string[];
  views: number;
  likes: number;
  shares: number;
  liked_by_user: boolean;
  comment_count: number;
  created_at: string;
  updated_at: string;
}
