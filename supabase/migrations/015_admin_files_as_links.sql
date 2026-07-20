-- Admin Files now stores a shareable link (e.g. a Google Drive URL) instead
-- of an uploaded file, matching how these documents already live in a
-- shared Drive folder. Drops the upload-specific columns; the admin-files
-- storage bucket itself is left in place (unused going forward) rather than
-- deleting any files someone may have already uploaded through it.
ALTER TABLE admin_files
  DROP COLUMN file_path,
  DROP COLUMN file_size,
  DROP COLUMN mime_type,
  ADD COLUMN file_url TEXT;
