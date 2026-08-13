-- A consulting manager can be appointed to a side (internal/external)
-- before being linked to any specific project via project_members. The org
-- chart uses this to place them under the right VP branch immediately,
-- instead of requiring a project assignment first. Harmless/unused for
-- every other role.
ALTER TABLE profiles ADD COLUMN consulting_track project_type;
