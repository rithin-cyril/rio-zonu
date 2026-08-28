REVOKE ALL ON FUNCTION public.is_moderator_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO service_role;