import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def test_insert():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    client = create_client(url, key)

    row = {
        "flow": "test_integration_flow",
        "raw_input": {"test": "data input"},
        "model_output": {"summary": "Passed integration test"},
        "notes": "Testing from python script directly"
    }

    print("Attempting to insert into 'labels' table...")
    try:
        response = client.table("labels").insert(row).execute()
        print("Success!", response.data)
    except Exception as e:
        print(f"Error inserting: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_insert()
