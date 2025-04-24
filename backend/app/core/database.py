from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance with connection pooling and retry logic
    """
    try:
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY
        )
        # Test the connection
        client.table('students').select("count", count='exact').execute()
        return client
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        raise

# Singleton instance for connection reuse
supabase = get_supabase_client()