from sqlmodel import Session
from app.db import engine
from app.models import User
import hashlib

def hash_password(password: str) -> str:
	return hashlib.sha256(password.encode()).hexdigest()

def register_user(email: str, password: str) -> User:
	"""
	Registers a new user with the given email and password.
	Returns the created User object.
	Raises ValueError if the email is already taken.
	"""
	hashed_pw = hash_password(password)
	with Session(engine) as session:
		# Check if user already exists
		existing = session.exec(User.select().where(User.email == email)).first()
		if existing:
			raise ValueError("Email already registered.")
		user = User(email=email, hashed_password=hashed_pw)
		session.add(user)
		session.commit()
		session.refresh(user)
		return user
