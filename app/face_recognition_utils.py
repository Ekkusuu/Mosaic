"""
CompreFace API integration for face verification.
Uses CompreFace REST API to compare faces between student ID and selfie.
"""
import os
import requests
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

COMPREFACE_API_URL = os.getenv("COMPREFACE_API_URL", "http://localhost:8000")
COMPREFACE_VERIFICATION_KEY = os.getenv("COMPREFACE_VERIFICATION_KEY", "")
COMPREFACE_DETECTION_KEY = os.getenv("COMPREFACE_DETECTION_KEY", "")

class FaceVerificationError(Exception):
    """Custom exception for face verification errors"""
    pass

def verify_faces(id_photo_bytes: bytes, selfie_bytes: bytes, threshold: float = 0.7) -> Dict[str, Any]:
    """
    Verify if the face in the student ID matches the face in the selfie.
    
    Args:
        id_photo_bytes: Student ID photo as bytes
        selfie_bytes: Selfie photo as bytes
        threshold: Similarity threshold (0-1). Default 0.7 means 70% similarity required
    
    Returns:
        Dict containing:
        - is_match: bool - Whether faces match
        - similarity: float - Similarity score (0-1)
        - message: str - Result message
    
    Raises:
        FaceVerificationError: If API call fails or no faces detected
    """
    if not COMPREFACE_VERIFICATION_KEY:
        raise FaceVerificationError("CompreFace Verification API key not configured")
    
    try:
        # CompreFace verification endpoint
        url = f"{COMPREFACE_API_URL}/api/v1/verification/verify"
        
        headers = {
            "x-api-key": COMPREFACE_VERIFICATION_KEY
        }
        
        # Prepare multipart form data
        files = {
            "source_image": ("id_photo.jpg", id_photo_bytes, "image/jpeg"),
            "target_image": ("selfie.jpg", selfie_bytes, "image/jpeg")
        }
        
        # Add threshold as form parameter
        data = {
            "det_prob_threshold": "0.8",  # Face detection confidence
            "limit": "1"  # Only compare top face
        }
        
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        
        print(f"CompreFace Verification Response Status: {response.status_code}")
        
        if response.status_code != 200:
            error_detail = response.json().get("message", "Unknown error")
            raise FaceVerificationError(f"CompreFace API error: {error_detail}")
        
        result = response.json()
        print(f"CompreFace Verification Result: {result}")
        
        # CompreFace returns result with similarity score
        if "result" not in result or len(result["result"]) == 0:
            raise FaceVerificationError("No faces detected in one or both images")
        
        # Get the first result
        verification_result = result["result"][0]
        
        # CompreFace verification returns: result[0]['face_matches'][0]['similarity']
        face_matches = verification_result.get("face_matches", [])
        if not face_matches:
            raise FaceVerificationError("No matching faces found in the target image")
        
        similarity = face_matches[0].get("similarity", 0.0)
        print(f"Similarity score: {similarity}")
        
        # Check if similarity meets threshold
        is_match = similarity >= threshold
        
        return {
            "is_match": is_match,
            "similarity": similarity,
            "message": f"Face match {'successful' if is_match else 'failed'}. Similarity: {similarity:.2%}"
        }
        
    except requests.exceptions.Timeout:
        raise FaceVerificationError("CompreFace API timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise FaceVerificationError(f"Network error: {str(e)}")
    except Exception as e:
        raise FaceVerificationError(f"Face verification failed: {str(e)}")


def detect_face(image_bytes: bytes) -> Dict[str, Any]:
    """
    Detect if a face exists in the image.
    Useful for pre-validation before verification.
    
    Args:
        image_bytes: Image data as bytes
    
    Returns:
        Dict containing:
        - face_detected: bool
        - face_count: int
        - message: str
    
    Raises:
        FaceVerificationError: If API call fails
    """
    if not COMPREFACE_DETECTION_KEY:
        raise FaceVerificationError("CompreFace Detection API key not configured")
    
    try:
        url = f"{COMPREFACE_API_URL}/api/v1/detection/detect"
        
        headers = {
            "x-api-key": COMPREFACE_DETECTION_KEY
        }
        
        files = {
            "file": ("image.jpg", image_bytes, "image/jpeg")
        }
        
        data = {
            "det_prob_threshold": "0.8",
            "limit": "0"  # Detect all faces
        }
        
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        
        if response.status_code != 200:
            error_detail = response.json().get("message", "Unknown error")
            raise FaceVerificationError(f"CompreFace API error: {error_detail}")
        
        result = response.json()
        
        face_count = len(result.get("result", []))
        
        return {
            "face_detected": face_count > 0,
            "face_count": face_count,
            "message": f"Detected {face_count} face(s)" if face_count > 0 else "No face detected"
        }
        
    except requests.exceptions.Timeout:
        raise FaceVerificationError("CompreFace API timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise FaceVerificationError(f"Network error: {str(e)}")
    except Exception as e:
        raise FaceVerificationError(f"Face detection failed: {str(e)}")
