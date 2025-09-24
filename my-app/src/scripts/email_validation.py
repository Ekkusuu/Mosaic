from fastapi import FastAPI
from pydantic import BaseModel
import json
from pathlib import Path
import re

app = FastAPI(title="University Email Validator")

# Load university domains once at startup
script_dir = Path(__file__).resolve().parent
json_path = script_dir.parent / "assets" / "universities.json"

def load_university_domains(json_file):
    with open(json_file, "r", encoding="utf-8") as f:
        universities = json.load(f)

    domains = set()
    for uni in universities:
        for domain in uni.get("domains", []):
            domains.add(domain.lower().strip())
    return domains

university_domains = load_university_domains(str(json_path))

# Pydantic model for request
class EmailRequest(BaseModel):
    email: str

def is_valid_university_email(email: str, domains: set) -> bool:
    """Validate email format and check if domain belongs to a university."""
    email_regex = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    if not re.match(email_regex, email):
        return False

    domain = email.split("@")[-1].lower()
    return any(domain == d or domain.endswith("." + d) for d in domains)

@app.post("/validate")
def validate_email(request: EmailRequest):
    result = is_valid_university_email(request.email, university_domains)
    return {"valid": result}
