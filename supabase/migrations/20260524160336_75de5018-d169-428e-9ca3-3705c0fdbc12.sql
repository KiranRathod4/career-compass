ALTER FUNCTION public.get_user_xp(UUID) SECURITY INVOKER;
ALTER FUNCTION public.get_user_level(INTEGER) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_user_xp(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_level(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_xp(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(INTEGER) TO authenticated;