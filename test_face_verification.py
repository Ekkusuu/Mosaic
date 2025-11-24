"""
Direct test of face verification endpoint bypassing browser cache
"""
import requests

# Replace these with your actual test data
EMAIL = "sdfkibghdsfbh@issa.utm.md"
STUDENT_ID = "12345678"

# Paths to the test images
ID_PHOTO_PATH = r"C:\Users\andre\Desktop\id_card.jpg"
SELFIE_PATH = r"C:\Users\andre\Desktop\selfie.jpg"

def test_upload_id_photo():
    """First upload the ID photo"""
    url = "http://localhost:8001/users/upload-id-photo"
    
    with open(ID_PHOTO_PATH, 'rb') as f:
        files = {'id_photo': ('id_photo.jpg', f, 'image/jpeg')}
        data = {'email': EMAIL}
        
        print(f"Uploading ID photo for {EMAIL}...")
        response = requests.post(url, files=files, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200

def test_verify_face():
    """Then verify with selfie"""
    url = "http://localhost:8001/users/verify-face"
    
    with open(SELFIE_PATH, 'rb') as f:
        files = {'selfie': ('selfie.jpg', f, 'image/jpeg')}
        data = {
            'email': EMAIL,
            'student_id': STUDENT_ID
        }
        
        print(f"\nVerifying face for {EMAIL}...")
        response = requests.post(url, files=files, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("\n✓ SUCCESS! Face verification passed!")
            print(f"Similarity: {response.json().get('similarity', 'N/A')}")
        else:
            print("\n✗ FAILED!")

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Face Verification Endpoint")
    print("=" * 60)
    
    # Test upload
    if test_upload_id_photo():
        # Test verification
        test_verify_face()
    else:
        print("ID photo upload failed, skipping verification test")
    
    print("\n" + "=" * 60)
