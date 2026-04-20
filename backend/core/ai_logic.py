import pdfplumber
import re
import io
import boto3
import requests
import json
from typing import List, Optional
from django.conf import settings

# ── Generative AI (Cloud-based) ──────────────────────────────────────────────
def gemini_generate_questions(job_title: str, skills: List[str]):
    """
    Call Gemini API to generate unique MCQs and Coding problems.
    Uses the cloud to keep local memory footprint < 1GB.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        # Fallback to smart bank if no key provided
        return get_questions_for_skills(skills)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
    Generate a technical interview assessment for the position: {job_title}.
    Skills to focus on: {", ".join(skills)}.
    
    Return a JSON object with:
    - mcqs: List of 3 objects with keys [question, options (list of 4), correct_index, points]
    - coding: List of 1 object with keys [title, question, starter_code, language, test_cases (list of 2 with keys [input, expected]), points]
    
    Ensure the output is strictly valid JSON.
    """

    try:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        response = requests.post(url, json=payload, timeout=30)
        data = response.json()
        
        # Parse the raw text from Gemini
        raw_text = data['candidates'][0]['content']['parts'][0]['text']
        # Remove markdown code blocks if present
        clean_json = re.sub(r'```json\n|\n```', '', raw_text).strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"Gemini generation failed: {e}")
        return get_questions_for_skills(skills)

# ── S3/MinIO client ──────────────────────────────────────────────────────────
def _get_s3_client():
    from django.conf import settings
    # Try to use settings first, fallback to defaults
    return boto3.client(
        "s3",
        endpoint_url=getattr(settings, "MINIO_ENDPOINT", "http://localhost:9000"),
        aws_access_key_id=getattr(settings, "MINIO_ROOT_USER", "minioadmin"),
        aws_secret_access_key=getattr(settings, "MINIO_ROOT_PASSWORD", "minioadmin"),
    )

# ── Known skills dictionary ──────────────────────────────────────────────────
KNOWN_SKILLS = {
    # Programming
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "sql",
    # Frameworks
    "react", "angular", "vue", "django", "flask", "fastapi", "spring",
    "express", "next.js", "nuxt", "tailwind", "bootstrap",
    # Data / ML
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "spark",
    "hadoop", "kafka", "airflow", "dbt",
    # DevOps / Cloud
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ansible",
    "jenkins", "github actions", "ci/cd",
    # Databases
    "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "dynamodb",
    "cassandra", "neo4j",
    # AI / Agents
    "ai", "agents", "llm", "generative ai", "nlp", "machine learning", "deep learning", "neural networks",
    # Soft / Other
    "agile", "scrum", "jira", "figma", "photoshop", "leadership",
    "communication", "problem solving", "project management",
}

# ── Parsing Logic ─────────────────────────────────────────────────────────────
def download_cv_from_minio(cv_url: str) -> bytes:
    parts = cv_url.split("/", 4)
    if len(parts) < 5:
        raise ValueError(f"Malformed cv_url: {cv_url}")
    bucket = parts[3]
    key = parts[4]
    buf = io.BytesIO()
    _get_s3_client().download_fileobj(bucket, key, buf)
    buf.seek(0)
    return buf.read()

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)

def extract_skills(text: str) -> List[str]:
    text_lower = text.lower()
    return sorted({s for s in KNOWN_SKILLS if s in text_lower})

def extract_experience(text: str) -> Optional[float]:
    matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?)", text, re.IGNORECASE)
    if matches:
        return max(float(m) for m in matches)
    return None

def extract_education(text: str) -> List[str]:
    degrees = []
    patterns = [r"(?:bachelor|b\.?s\.?|b\.?tech|b\.?e\.?)[\w\s,]*", r"(?:master|m\.?s\.?|m\.?tech|m\.?e\.?|mba)[\w\s,]*"]
    for p in patterns:
        found = re.findall(p, text, re.IGNORECASE)
        degrees.extend(f.strip() for f in found if len(f.strip()) > 3)
    return degrees[:5]

# ── Smart Question Bank ───────────────────────────────────────────────────────
QUESTION_BANK = {
    "python": {
        "MCQ": [
            {"text": "What is the output of `print(type(5 / 2))` in Python 3?", "options": ["<class 'int'>", "<class 'float'>", "<class 'long'>", "<class 'decimal'>"], "correct": 1, "points": 5},
            {"text": "Which of these is used to define a block of code in Python?", "options": ["Curly braces {}", "Parentheses ()", "Indentation", "Semicolons ;"], "correct": 2, "points": 5},
            {"text": "How do you start a list in Python?", "options": ["{}", "[]", "()", "<>"], "correct": 1, "points": 5}
        ],
        "CODING": [
            {
                "title": "Reverse a String",
                "text": "Write a function `solution(s)` that reverses a given string.",
                "starter": "def solution(s):\n    # Write code here\n    return ''",
                "language": "python",
                "test_cases": [{"input": "\"hello\"", "expected": "\"olleh\""}, {"input": "\"python\"", "expected": "\"nohtyp\""}]
            },
            {
                "title": "Find Max",
                "text": "Write a function `solution(arr)` that returns the maximum element in a list.",
                "starter": "def solution(arr):\n    # Write code here\n    return 0",
                "language": "python",
                "test_cases": [{"input": "[1, 5, 3]", "expected": "5"}, {"input": "[-10, 0, -2]", "expected": "0"}]
            }
        ]
    },
    "javascript": {
        "MCQ": [
            {"text": "Which keyword is used to declare a block-scoped variable in modern JS?", "options": ["var", "let", "global", "def"], "correct": 1, "points": 5},
            {"text": "What does `typeof []` return in JavaScript?", "options": ["'array'", "'object'", "'list'", "'undefined'"], "correct": 1, "points": 5}
        ],
        "CODING": [
            {
                "title": "Filter Evens",
                "text": "Implement `solution(arr)` to return only even numbers from an array.",
                "starter": "function solution(arr) {\n  // Write code\n}",
                "language": "javascript",
                "test_cases": [{"input": "[1, 2, 3, 4]", "expected": "[2, 4]"}, {"input": "[5, 7, 9]", "expected": "[]"}]
            }
        ]
    },
    "java": {
        "MCQ": [
            {"text": "Which access modifier makes a member visible only within its own class?", "options": ["public", "protected", "private", "default"], "correct": 2, "points": 5}
        ],
        "CODING": [
            {
                "title": "Factorial",
                "text": "Write a recursive function to find the factorial of N.",
                "starter": "public class Solution {\n    public int solution(int n) {\n        return 0;\n    }\n}",
                "language": "java",
                "test_cases": [{"input": "5", "expected": "120"}, {"input": "0", "expected": "1"}]
            }
        ]
    },
    "sql": {
        "MCQ": [
            {"text": "Which SQL keyword is used to sort the result-set?", "options": ["SORT BY", "ORDER BY", "ARRANGE BY", "GROUP BY"], "correct": 1, "points": 5}
        ],
        "CODING": [
            {
                "title": "Select All Users",
                "text": "Write a query to select all columns from the 'users' table where status is 'active'.",
                "starter": "SELECT * FROM users WHERE ...",
                "language": "sql",
                "test_cases": []  # SQL is handled by query checking usually
            }
        ]
    },
    "general": {
        "MCQ": [
            {"text": "What is the time complexity of searching an element in a balanced binary search tree?", "options": ["O(1)", "O(n)", "O(log n)", "O(n log n)"], "correct": 2, "points": 5}
        ],
        "CODING": [
            {
                "title": "FizzBuzz",
                "text": "Return 'Fizz' if i is divisible by 3, 'Buzz' if by 5, and 'FizzBuzz' if both.",
                "starter": "def solution(n):\n    pass",
                "language": "python",
                "test_cases": [{"input": "3", "expected": "\"Fizz\""}, {"input": "15", "expected": "\"FizzBuzz\""}]
            }
        ]
    }
}

def get_questions_for_skills(skills: List[str]):
    """Pick a varied set of questions (MCQ + Coding) based on detected skills."""
    import random
    selected = {"MCQ": [], "CODING": []}
    
    skill_list = [s.lower() for s in skills]
    available_stacks = list(QUESTION_BANK.keys())
    matched_stacks = [s for s in available_stacks if s in skill_list]
    
    # Always include 'general' and ensure at least one technical stack
    if "general" not in matched_stacks:
        matched_stacks.append("general")
    if len(matched_stacks) < 2:
        # If no skills matched, ensure we at least have python and general
        if "python" not in matched_stacks: matched_stacks.append("python") 
        if "javascript" not in matched_stacks: matched_stacks.append("javascript")
    for stack in matched_stacks:
        stack_q = QUESTION_BANK.get(stack, {})
        # Pull 2 MCQs and 1-2 Coding questions per matched stack
        selected["MCQ"].extend(random.sample(stack_q.get("MCQ", []), min(2, len(stack_q.get("MCQ", [])))))
        selected["CODING"].extend(random.sample(stack_q.get("CODING", []), min(2, len(stack_q.get("CODING", [])))))
        
    # Shuffle and cap to keep exam size reasonable (e.g. 5 questions total)
    random.shuffle(selected["MCQ"])
    random.shuffle(selected["CODING"])
    
    return {
        "MCQ": selected["MCQ"][:3], 
        "CODING": selected["CODING"][:2]
    }


# ── Scoring Logic ─────────────────────────────────────────────────────────────
def calculate_ats_score(cv_skills, cv_exp, cv_edu, cv_text, job_skills, job_desc):
    cv_set = {s.lower() for s in cv_skills}
    job_set = {s.lower() for s in job_skills}
    matched = cv_set & job_set
    skill_pct = (len(matched) / len(job_set) * 100) if job_set else 100

    exp_bonus = 0
    if cv_exp:
        if cv_exp >= 7: exp_bonus = 15
        elif cv_exp >= 4: exp_bonus = 10
        elif cv_exp >= 2: exp_bonus = 5

    edu_bonus = 0
    edu_text = " ".join(cv_edu).lower()
    if "master" in edu_text: edu_bonus = 7
    elif "bachelor" in edu_text: edu_bonus = 4

    kw_bonus = 0
    if job_desc:
        words = {w.lower() for w in job_desc.split() if len(w) > 4}
        hits = sum(1 for w in words if w in cv_text.lower())
        kw_bonus = min((hits / len(words) * 100) * 0.15, 10) if words else 0

    total = (skill_pct * 0.65) + exp_bonus + edu_bonus + kw_bonus
    return round(min(max(total, 0), 100), 2), sorted(matched)
