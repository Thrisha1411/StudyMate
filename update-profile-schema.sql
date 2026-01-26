-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS grade_level TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS skills TEXT[], -- Array of strings for skills
ADD COLUMN IF NOT EXISTS bio TEXT, -- Resume/Summary
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS major TEXT;

-- Update RLS policies to allow updating these columns (existing policy covers UPDATE on all columns usually, but good to check)
-- Existing policy: CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
-- This covers all columns, so we are good!
