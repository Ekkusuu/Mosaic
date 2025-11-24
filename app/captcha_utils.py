"""
CAPTCHA generation and validation utilities.
Uses the captcha library to generate image-based CAPTCHAs with random strings.
"""
from captcha.image import ImageCaptcha
import secrets
import string
import io
import base64
from typing import Tuple


def generate_captcha_text(length: int = 6) -> str:
    """
    Generate a random CAPTCHA text string.
    
    Args:
        length: Length of the CAPTCHA string (default: 6)
    
    Returns:
        Random string of uppercase letters and digits
    """
    # Use both uppercase letters and digits for variety
    alphabet = string.ascii_uppercase + string.digits
    # Avoid confusing characters like O/0, I/1, etc.
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_captcha_image(text: str) -> Tuple[str, bytes]:
    """
    Generate a CAPTCHA image from the given text.
    
    Args:
        text: The text to render in the CAPTCHA image
    
    Returns:
        Tuple of (base64_encoded_image, raw_image_bytes)
    """
    # Create ImageCaptcha generator with various font sizes
    image_captcha = ImageCaptcha(width=280, height=90, fonts=None)
    
    # Generate the image
    image_data = image_captcha.generate(text)
    
    # Read the image bytes
    image_bytes = image_data.read()
    
    # Encode to base64 for easy transmission in JSON
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    return base64_image, image_bytes


def create_captcha() -> Tuple[str, str]:
    """
    Create a complete CAPTCHA with text and image.
    
    Returns:
        Tuple of (captcha_text, base64_encoded_image)
    """
    captcha_text = generate_captcha_text()
    base64_image, _ = generate_captcha_image(captcha_text)
    return captcha_text, base64_image


def validate_captcha(user_input: str, expected_text: str) -> bool:
    """
    Validate user's CAPTCHA input against the expected text.
    Case-insensitive comparison.
    
    Args:
        user_input: The user's CAPTCHA attempt
        expected_text: The correct CAPTCHA text
    
    Returns:
        True if valid, False otherwise
    """
    if not user_input or not expected_text:
        return False
    return user_input.strip().upper() == expected_text.strip().upper()
