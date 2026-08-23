# backend/tests/test_syntax.py
"""
Quick syntax / import check for all backend modules.
No database connection needed – just verifies the modules parse correctly.
"""

import sys
import os
import importlib

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_import_database():
    mod = importlib.import_module("app.database")
    assert hasattr(mod, "engine")
    assert hasattr(mod, "AsyncSessionLocal")
    assert hasattr(mod, "Base")
    assert hasattr(mod, "get_db")


def test_import_models():
    mod = importlib.import_module("app.models")
    assert hasattr(mod, "User")
    assert hasattr(mod, "Report")


def test_import_schemas():
    mod = importlib.import_module("app.schemas")
    assert hasattr(mod, "UploadResponse")
    assert hasattr(mod, "ReportOut")
    assert hasattr(mod, "HistoryResponse")


def test_import_crud():
    mod = importlib.import_module("app.crud")
    assert hasattr(mod, "create_report")
    assert hasattr(mod, "get_reports_by_user")
    assert hasattr(mod, "update_report_summary")
    assert hasattr(mod, "update_report_raw_text")


def test_import_ocr():
    mod = importlib.import_module("app.ocr")
    assert hasattr(mod, "extract_text_from_file")


def test_import_tasks():
    mod = importlib.import_module("app.tasks")
    assert hasattr(mod, "parse_test_values")
    assert hasattr(mod, "launch_processing")


if __name__ == "__main__":
    test_import_database()
    test_import_models()
    test_import_schemas()
    test_import_crud()
    test_import_ocr()
    test_import_tasks()
    print("All import tests passed!")
