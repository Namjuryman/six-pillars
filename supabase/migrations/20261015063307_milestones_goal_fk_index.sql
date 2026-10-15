-- Cover the composite FK in its declared order, in addition to owner-first filtering.
create index milestones_owner_goal_fk on public.milestones(goal_id,owner_id);
