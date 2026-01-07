
// Initialize Supabase using the global variable from CDN
const supabaseUrl = 'https://zcjbvvuqllzehskepyax.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjamJ2dnVxbGx6ZWhza2VweWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTQ4NTksImV4cCI6MjA4Mjk5MDg1OX0.9iWvW263QJWqY53Be2fBOOhLdQu9n8cDab7b78ncRBU';

export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
