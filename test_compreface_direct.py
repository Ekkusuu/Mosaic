"""
Direct test of CompreFace API to see what's happening
"""
import requests
from dotenv import load_dotenv
import os

load_dotenv()

VERIFICATION_KEY = os.getenv("COMPREFACE_VERIFICATION_KEY")
DETECTION_KEY = os.getenv("COMPREFACE_DETECTION_KEY")

ID_PHOTO_PATH = r"C:\Users\andre\Desktop\id_card.jpg"
SELFIE_PATH = r"C:\Users\andre\Desktop\selfie.jpg"

print("=" * 60)
print("Testing CompreFace API Directly")
print("=" * 60)

# Test 1: Detect face in ID photo
print("\n1. Testing face detection in ID photo...")
with open(ID_PHOTO_PATH, 'rb') as f:
    files = {'file': f}
    headers = {'x-api-key': DETECTION_KEY}
    response = requests.post(
        'http://localhost:8000/api/v1/detection/detect?limit=1&det_prob_threshold=0.8',
        headers=headers,
        files=files
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
# Test 2: Detect face in selfie
print("\n2. Testing face detection in selfie...")
with open(SELFIE_PATH, 'rb') as f:
    files = {'file': f}
    headers = {'x-api-key': DETECTION_KEY}
    response = requests.post(
        'http://localhost:8000/api/v1/detection/detect?limit=1&det_prob_threshold=0.8',
        headers=headers,
        files=files
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

# Test 3: Verify faces match
print("\n3. Testing face verification...")
with open(ID_PHOTO_PATH, 'rb') as source, open(SELFIE_PATH, 'rb') as target:
    files = {
        'source_image': ('id_photo.jpg', source, 'image/jpeg'),
        'target_image': ('selfie.jpg', target, 'image/jpeg')
    }
    headers = {'x-api-key': VERIFICATION_KEY}
    response = requests.post(
        'http://localhost:8000/api/v1/verification/verify?limit=1&det_prob_threshold=0.8',
        headers=headers,
        files=files
    )
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Full Response: {result}")
    
    if response.status_code == 200:
        if 'result' in result and len(result['result']) > 0:
            # CompreFace verification returns: result[0]['face_matches'][0]['similarity']
            face_matches = result['result'][0].get('face_matches', [])
            if face_matches:
                similarity = face_matches[0].get('similarity', 0)
            else:
                similarity = result['result'][0].get('similarity', 0)
            print(f"\n✓ Similarity: {similarity * 100:.2f}%")
            if similarity >= 0.7:
                print("✓ MATCH! Faces are similar enough")
            else:
                print("✗ NO MATCH - Faces are too different")
        else:
            print("✗ No faces detected in one or both images")

print("\n" + "=" * 60)
