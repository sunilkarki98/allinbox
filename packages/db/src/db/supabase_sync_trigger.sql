-- ============================================================================
-- Supabase Auth Sync Trigger
-- Ensures every user in auth.users has a matching profile in public.tenants
-- ============================================================================

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenants (id, email, status, subscription_plan, trial_ends_at, onboarding_completed, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    'TRIAL', 
    'FREE', 
    now() + interval '7 days', 
    false,
    'CUSTOMER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. (Optional) Backfill existing users
-- INSERT INTO public.tenants (id, email, status, subscription_plan, trial_ends_at, onboarding_completed, role)
-- SELECT id, email, 'TRIAL', 'FREE', now() + interval '7 days', false, 'CUSTOMER'
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
