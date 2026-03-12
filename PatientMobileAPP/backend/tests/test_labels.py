import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_supabase_labels_integration():
    """Test pushing data to the Supabase labels table."""
    payload = {
        "flow": "test_integration_flow",
        "raw_input": {"test": "data input"},
        "model_output": {"summary": "Passed integration test"},
        "notes": "Testing from pytest to Supabase directly"
    }

    # The API might be mounted on /labels directly based on tags
    response = client.post("/labels", json=payload)
    
    assert response.status_code in [200, 201], f"Failed: {response.text}"
    data = response.json()
    assert "status" in data or "id" in data
    print("\n✅ Successfully pushed label to Supabase.")
