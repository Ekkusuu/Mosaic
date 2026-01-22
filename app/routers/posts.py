"""Posts (Q&A) router for community questions and answers."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timezone
import json

from app.db import get_session
from app.models import Post, PostCreate, PostRead, User, Comment, CommentCreate, CommentRead
from app.security import get_current_user

router = APIRouter()


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
        likes=post.likes,
        shares=post.shares,
        liked_by_user=False,
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
        liked_by = json.loads(post.liked_by) if post.liked_by else []
        comment_count = session.exec(select(Comment).where(Comment.post_id == post.id)).all()
        
        result.append(PostRead(
            id=post.id,
            title=post.title,
            body=post.body,
            author_id=post.author_id,
            author_name=post.author_name,
            tags=json.loads(post.tags) if post.tags else [],
            views=post.views,
            likes=post.likes,
            shares=post.shares,
            liked_by_user=current_user.id in liked_by if current_user else False,
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
    
    post.views += 1
    session.add(post)
    session.commit()
    session.refresh(post)
    
    liked_by = json.loads(post.liked_by) if post.liked_by else []
    comment_count = session.exec(select(Comment).where(Comment.post_id == post.id)).all()
    
    return PostRead(
        id=post.id,
        title=post.title,
        body=post.body,
        author_id=post.author_id,
        author_name=post.author_name,
        tags=json.loads(post.tags) if post.tags else [],
        views=post.views,
        likes=post.likes,
        shares=post.shares,
        liked_by_user=current_user.id in liked_by if current_user else False,
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


@router.post("/{post_id}/like", response_model=PostRead)
def like_post(
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
    
    liked_by = json.loads(post.liked_by) if post.liked_by else []
    
    if current_user.id in liked_by:
        liked_by.remove(current_user.id)
        post.likes = max(0, post.likes - 1)
    else:
        liked_by.append(current_user.id)
        post.likes += 1
    
    post.liked_by = json.dumps(liked_by)
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
        likes=post.likes,
        shares=post.shares,
        liked_by_user=current_user.id in liked_by,
        comment_count=len(comment_count),
        created_at=post.created_at,
        updated_at=post.updated_at
    )


@router.post("/{post_id}/share")
def share_post(
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
    
    post.shares += 1
    session.add(post)
    session.commit()
    
    return {"message": "Post shared successfully", "shares": post.shares}


@router.get("/{post_id}/comments", response_model=List[CommentRead])
def get_comments(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    comments = session.exec(
        select(Comment).where(Comment.post_id == post_id).order_by(Comment.likes.desc(), Comment.created_at.desc())
    ).all()
    
    result = []
    for comment in comments:
        liked_by = json.loads(comment.liked_by) if comment.liked_by else []
        result.append(CommentRead(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            user_name=comment.user_name,
            content=comment.content,
            likes=comment.likes,
            liked_by_user=current_user.id in liked_by if current_user else False,
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
        likes=0,
        liked_by="[]",
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
        likes=comment.likes,
        liked_by_user=False,
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


@router.post("/comments/{comment_id}/like", response_model=CommentRead)
def like_comment(
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
    
    liked_by = json.loads(comment.liked_by) if comment.liked_by else []
    
    if current_user.id in liked_by:
        liked_by.remove(current_user.id)
        comment.likes = max(0, comment.likes - 1)
    else:
        liked_by.append(current_user.id)
        comment.likes += 1
    
    comment.liked_by = json.dumps(liked_by)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    return CommentRead(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        user_name=comment.user_name,
        content=comment.content,
        likes=comment.likes,
        liked_by_user=current_user.id in liked_by,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )
