import os
from uuid import uuid4
from src.services.storage import save_pdf, get_pdf_path

def test_save_and_get_pdf(tmp_path):
    # Mock REPORTS_DIR for the test
    import src.services.storage
    original_dir = src.services.storage.REPORTS_DIR
    src.services.storage.REPORTS_DIR = str(tmp_path / "reports")
    
    task_id = uuid4()
    content = b"fake pdf content"
    
    # Save
    path = save_pdf(task_id, content)
    assert os.path.exists(path)
    
    # Get
    retrieved_path = get_pdf_path(task_id)
    assert retrieved_path == path
    
    # Cleanup
    src.services.storage.REPORTS_DIR = original_dir

def test_get_pdf_not_found():
    task_id = uuid4()
    assert get_pdf_path(task_id) is None
