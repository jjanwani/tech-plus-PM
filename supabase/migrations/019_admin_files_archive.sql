-- Some Admin Files documents (forms, trackers) get recreated each
-- semester — archive the old version instead of deleting it outright.
ALTER TABLE admin_files
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
