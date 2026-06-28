-- Allow any authenticated user to update their own display_name
-- Uses SECURITY DEFINER so it bypasses RLS while still being restricted to the caller's own row
CREATE OR REPLACE FUNCTION public.update_own_display_name(new_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(new_display_name) = '' THEN
    RAISE EXCEPTION 'ชื่อที่แสดงต้องไม่ว่างเปล่า';
  END IF;
  UPDATE public.profiles
  SET display_name = trim(new_display_name)
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_display_name(text) TO authenticated;
