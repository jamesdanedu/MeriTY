from supabase import create_client, Client
from app.core.config import get_settings 


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance with connection pooling and retry logic
    """
    try:
        client = create_client(
            supabase_url=get_settings().SUPABASE_URL,
            supabase_key=get_settings().SUPABASE_KEY 
        )
        # Test the connection
       # client.table("academic_years").select("id").limit(1).execute()
        return client
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        raise

# Singleton instance for connection reuse
supabaseDB = get_supabase_client()
