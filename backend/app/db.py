# app/db.py
import supabase
from supabase import create_client, Client

from app.core.config import settings

# Create Supabase client
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_db() -> Client:
    """
    Get a Supabase client
    """
    return supabase_client