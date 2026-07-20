-- The original members_select policy queried project_members directly from
-- within its own USING clause (a raw EXISTS subquery on the same table).
-- That subquery is itself subject to RLS, which re-evaluates members_select,
-- which re-runs the subquery, etc. -> "infinite recursion detected in policy
-- for relation project_members".
--
-- Fix: use the existing SECURITY DEFINER project_member_role() helper
-- (already used by members_manage) instead of a raw self-referential
-- subquery, since SECURITY DEFINER functions bypass RLS on the underlying
-- table and don't re-trigger the policy.

DROP POLICY IF EXISTS "members_select" ON project_members;

CREATE POLICY "members_select" ON project_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external')
    OR project_member_role(project_id) IN ('project_manager','consulting_manager')
  );
