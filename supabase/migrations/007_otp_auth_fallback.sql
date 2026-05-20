-- Update trigger to handle OTP users without full_name metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      NULLIF(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
      split_part(NEW.email, '@', 1)
    )
  );

  -- Create default workspace for new user
  INSERT INTO public.workspaces (owner_id, name)
  VALUES (
    (SELECT id FROM public.users WHERE auth_id = NEW.id),
    'My Workspace'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
