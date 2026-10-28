import os
from uuid import UUID

REPORTS_DIR = "reports"

def save_pdf(task_id: UUID, content: bytes):
    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR)
    
    file_path = os.path.join(REPORTS_DIR, f"{task_id}.pdf")
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path

def get_pdf_path(task_id: UUID):
    file_path = os.path.join(REPORTS_DIR, f"{task_id}.pdf")
    if os.path.exists(file_path):
        return file_path
    return None
