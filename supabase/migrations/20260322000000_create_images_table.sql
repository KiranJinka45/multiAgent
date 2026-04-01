-- Create the generated_images table
CREATE TABLE IF NOT EXISTS public.generated_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    url TEXT NOT NULL,
    model TEXT DEFAULT 'pollinations' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Create policy for users to insert their own images
CREATE POLICY "Users can insert their own generated images"
    ON public.generated_images
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create policy for users to view their own images
CREATE POLICY "Users can view their own generated images"
    ON public.generated_images
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Create policy for users to delete their own images
CREATE POLICY "Users can delete their own generated images"
    ON public.generated_images
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Index for retrieving users' images sorted by created_at
CREATE INDEX IF NOT EXISTS generated_images_user_id_idx ON public.generated_images(user_id, created_at DESC);
