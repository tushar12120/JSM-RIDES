import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export { createClient } // Export the function for re-use

export const SUPABASE_URL = 'https://zcjbvvuqllzehskepyax.supabase.co'
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjamJ2dnVxbGx6ZWhza2VweWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTQ4NTksImV4cCI6MjA4Mjk5MDg1OX0.9iWvW263QJWqY53Be2fBOOhLdQu9n8cDab7b78ncRBU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
