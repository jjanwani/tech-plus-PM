-- The per-project "Deliverables" tab is being relabeled "Files" and gains a
-- category so files can be told apart at a glance (meeting minutes vs. the
-- actual deliverable vs. research notes vs. everything else). The underlying
-- table/API stay named "deliverables" — admins still assign deliverables
-- with due dates that surface on the roadmap.

CREATE TYPE file_type AS ENUM (
  'meeting_minutes',
  'deliverable',
  'research',
  'other'
);

ALTER TABLE deliverables
  ADD COLUMN file_type file_type NOT NULL DEFAULT 'deliverable';
