
-- Fix malformed media_url for lesson c17b7555 (has extra text after the actual URL)
UPDATE course_lessons 
SET media_url = 'https://jevcgtpkartfvixnauhg.supabase.co/storage/v1/object/public/daily-content/courses/video-1769735595623.mp4'
WHERE id = 'c17b7555-3662-4c4a-8a1d-e7636e2d4a72';
