"""Posts (Q&A) router for community questions and answers."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import json

from app.db import get_session
from app.models import Post, PostCreate, PostRead, User, Comment, CommentCreate, CommentRead, PostViewLog
from app.security import get_current_user

router = APIRouter()

# View cooldown in seconds (1 hour = 3600 seconds)
VIEW_COOLDOWN_SECONDS = 3600


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def validate_post_title(title: str) -> str:
    title = title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question title cannot be empty"
        )
    if len(title) < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question title must be at least 15 characters"
        )
    if len(title) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question title cannot exceed 500 characters"
        )
    return title


def validate_post_content(content: str) -> str:
    content = content.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question details cannot be empty"
        )
    if len(content) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question details must be at least 30 characters"
        )
    if len(content) > 50000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question details cannot exceed 50000 characters"
        )
    return content


def validate_tags(tags: List[str]) -> List[str]:
    if not tags:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one tag is required"
        )
    if len(tags) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 tags allowed"
        )
    
    normalized_tags = []
    for tag in tags:
        tag = tag.strip().lower().replace(' ', '-')
        if not tag:
            continue
        if len(tag) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each tag cannot exceed 50 characters"
            )
        if tag not in normalized_tags:
            normalized_tags.append(tag)
    
    if not normalized_tags:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one valid tag is required"
        )
    
    return normalized_tags


@router.post("/create", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    post_data: PostCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new post (question)."""
    title = validate_post_title(post_data.title)
    content = validate_post_content(post_data.content)
    tags = validate_tags(post_data.tags)
    
    author_name = current_user.name
    
    post = Post(
        title=title,
        body=content,
        author_id=current_user.id,
        author_name=author_name,
        tags=json.dumps(tags),
        created_at=utcnow(),
        updated_at=utcnow()
    )
    
    session.add(post)
    session.commit()
    session.refresh(post)
    
    return PostRead(
        id=post.id,
        title=post.title,
        body=post.body,
        author_id=post.author_id,
        author_name=post.author_name,
        tags=json.loads(post.tags),
        views=post.views,
        upvotes=post.upvotes,
        downvotes=post.downvotes,
        user_vote=None,
        comment_count=0,
        created_at=post.created_at,
        updated_at=post.updated_at
    )


@router.get("", response_model=List[PostRead])
def get_posts(
    skip: int = 0,
    limit: int = 100,
    author_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    statement = select(Post).order_by(Post.created_at.desc())
    
    if author_id:
        statement = statement.where(Post.author_id == author_id)
    
    statement = statement.offset(skip).limit(limit)
    posts = session.exec(statement).all()
    
    result = []
    for post in posts:
        voted_by = json.loads(post.voted_by) if post.voted_by else {}
        user_vote = voted_by.get(str(current_user.id)) if current_user else None
        comment_count = session.exec(select(Comment).where(Comment.post_id == post.id)).all()
        
        result.append(PostRead(
            id=post.id,
            title=post.title,
            body=post.body,
            author_id=post.author_id,
            author_name=post.author_name,
            tags=json.loads(post.tags) if post.tags else [],
            views=post.views,
            upvotes=post.upvotes,
            downvotes=post.downvotes,
            user_vote=user_vote,
            comment_count=len(comment_count),
            created_at=post.created_at,
            updated_at=post.updated_at
        ))
    
    return result


@router.get("/{post_id}", response_model=PostRead)
def get_post(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Rate-limited view increment
    if current_user:
        cutoff_time = utcnow() - timedelta(seconds=VIEW_COOLDOWN_SECONDS)
        recent_view = session.exec(
            select(PostViewLog)
            .where(PostViewLog.post_id == post_id)
            .where(PostViewLog.user_id == current_user.id)
            .where(PostViewLog.viewed_at > cutoff_time)
        ).first()
        
        if not recent_view:
            # Log the view and increment
            view_log = PostViewLog(post_id=post_id, user_id=current_user.id)
            session.add(view_log)
            post.views += 1
            session.add(post)
            session.commit()
            session.refresh(post)
    
    voted_by = json.loads(post.voted_by) if post.voted_by else {}
    user_vote = voted_by.get(str(current_user.id)) if current_user else None
    comment_count = session.exec(select(Comment).where(Comment.post_id == post.id)).all()
    
    return PostRead(
        id=post.id,
        title=post.title,
        body=post.body,
        author_id=post.author_id,
        author_name=post.author_name,
        tags=json.loads(post.tags) if post.tags else [],
        views=post.views,
        upvotes=post.upvotes,
        downvotes=post.downvotes,
        user_vote=user_vote,
        comment_count=len(comment_count),
        created_at=post.created_at,
        updated_at=post.updated_at
    )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts"
        )
    
    session.delete(post)
    session.commit()
    return None


@router.post("/{post_id}/vote", response_model=PostRead)
def vote_post(
    post_id: int,
    vote_type: str,  # "up" or "down"
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Vote on a post (upvote or downvote). Toggle behavior."""
    if vote_type not in ("up", "down"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vote type. Must be 'up' or 'down'"
        )
    
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    voted_by = json.loads(post.voted_by) if post.voted_by else {}
    user_id_str = str(current_user.id)
    current_vote = voted_by.get(user_id_str)
    
    if current_vote == vote_type:
        # Same vote - remove it (toggle off)
        del voted_by[user_id_str]
        if vote_type == "up":
            post.upvotes = max(0, post.upvotes - 1)
        else:
            post.downvotes = max(0, post.downvotes - 1)
        new_vote = None
    elif current_vote:
        # Different vote - switch it
        voted_by[user_id_str] = vote_type
        if vote_type == "up":
            post.upvotes += 1
            post.downvotes = max(0, post.downvotes - 1)
        else:
            post.downvotes += 1
            post.upvotes = max(0, post.upvotes - 1)
        new_vote = vote_type
    else:
        # No current vote - add it
        voted_by[user_id_str] = vote_type
        if vote_type == "up":
            post.upvotes += 1
        else:
            post.downvotes += 1
        new_vote = vote_type
    
    post.voted_by = json.dumps(voted_by)
    session.add(post)
    session.commit()
    session.refresh(post)
    
    comment_count = session.exec(select(Comment).where(Comment.post_id == post.id)).all()
    
    return PostRead(
        id=post.id,
        title=post.title,
        body=post.body,
        author_id=post.author_id,
        author_name=post.author_name,
        tags=json.loads(post.tags) if post.tags else [],
        views=post.views,
        upvotes=post.upvotes,
        downvotes=post.downvotes,
        user_vote=new_vote,
        comment_count=len(comment_count),
        created_at=post.created_at,
        updated_at=post.updated_at
    )


@router.get("/{post_id}/comments", response_model=List[CommentRead])
def get_comments(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    comments = session.exec(
        select(Comment).where(Comment.post_id == post_id).order_by(Comment.upvotes.desc(), Comment.created_at.desc())
    ).all()
    
    result = []
    for comment in comments:
        voted_by = json.loads(comment.voted_by) if comment.voted_by else {}
        user_vote = voted_by.get(str(current_user.id)) if current_user else None
        result.append(CommentRead(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            user_name=comment.user_name,
            content=comment.content,
            upvotes=comment.upvotes,
            downvotes=comment.downvotes,
            user_vote=user_vote,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        ))
    
    return result


@router.post("/{post_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    comment_data: CommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    content = comment_data.content.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment cannot be empty"
        )
    
    if len(content) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment cannot exceed 5000 characters"
        )
    
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        user_name=current_user.name,
        content=content,
        upvotes=0,
        downvotes=0,
        voted_by="{}",
        created_at=utcnow(),
        updated_at=utcnow()
    )
    
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    return CommentRead(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        user_name=comment.user_name,
        content=comment.content,
        upvotes=comment.upvotes,
        downvotes=comment.downvotes,
        user_vote=None,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )
    
    session.delete(comment)
    session.commit()
    return None


@router.post("/comments/{comment_id}/vote", response_model=CommentRead)
def vote_comment(
    comment_id: int,
    vote_type: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Vote on a comment. vote_type must be 'up' or 'down'."""
    if vote_type not in ("up", "down"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="vote_type must be 'up' or 'down'"
        )
    
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    voted_by = json.loads(comment.voted_by) if comment.voted_by else {}
    user_id_str = str(current_user.id)
    current_vote = voted_by.get(user_id_str)
    
    if current_vote == vote_type:
        # Remove the vote (toggle off)
        del voted_by[user_id_str]
        if vote_type == "up":
            comment.upvotes = max(0, comment.upvotes - 1)
        else:
            comment.downvotes = max(0, comment.downvotes - 1)
        new_user_vote = None
    elif current_vote is not None:
        # Switching vote
        voted_by[user_id_str] = vote_type
        if vote_type == "up":
            comment.upvotes += 1
            comment.downvotes = max(0, comment.downvotes - 1)
        else:
            comment.downvotes += 1
            comment.upvotes = max(0, comment.upvotes - 1)
        new_user_vote = vote_type
    else:
        # New vote
        voted_by[user_id_str] = vote_type
        if vote_type == "up":
            comment.upvotes += 1
        else:
            comment.downvotes += 1
        new_user_vote = vote_type
    
    comment.voted_by = json.dumps(voted_by)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    return CommentRead(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        user_name=comment.user_name,
        content=comment.content,
        upvotes=comment.upvotes,
        downvotes=comment.downvotes,
        user_vote=new_user_vote,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )
