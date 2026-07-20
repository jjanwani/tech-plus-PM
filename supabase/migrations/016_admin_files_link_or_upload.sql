-- Admin Files documents can be either a pasted shareable link (file_url,
-- added in 015) or an uploaded file (file_path/file_size/mime_type,
-- restored here) — an admin picks one or the other per document.
ALTER TABLE admin_files
  ADD COLUMN file_path TEXT,
  ADD COLUMN file_size INTEGER,
  ADD COLUMN mime_type TEXT;
