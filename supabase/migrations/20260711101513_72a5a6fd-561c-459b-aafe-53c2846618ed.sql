
-- ==== ENUMS ====
CREATE TYPE public.app_role AS ENUM ('user', 'agent', 'admin');
CREATE TYPE public.complaint_category AS ENUM ('electricity','water_supply','road_damage','garbage','municipality','police','cyber_crime','transport','health','education','others');
CREATE TYPE public.complaint_priority AS ENUM ('low','medium','high','critical');
CREATE TYPE public.complaint_status AS ENUM ('pending','assigned','in_progress','resolved','rejected','closed');

-- ==== PROFILES ====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==== USER ROLES ====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'agent' THEN 2 ELSE 3 END LIMIT 1;
$$;

-- ==== COMPLAINTS ====
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category complaint_category NOT NULL,
  priority complaint_priority NOT NULL DEFAULT 'medium',
  status complaint_status NOT NULL DEFAULT 'pending',
  location TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_notes TEXT,
  resolution_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_agent UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_complaints_created_by ON public.complaints(created_by);
CREATE INDEX idx_complaints_assigned_agent ON public.complaints(assigned_agent);
CREATE INDEX idx_complaints_status ON public.complaints(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- ==== STATUS HISTORY (timeline) ====
CREATE TABLE public.complaint_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  from_status complaint_status,
  to_status complaint_status NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_complaint ON public.complaint_status_history(complaint_id);
GRANT SELECT, INSERT ON public.complaint_status_history TO authenticated;
GRANT ALL ON public.complaint_status_history TO service_role;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

-- ==== MESSAGES (chat) ====
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  sender UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_complaint ON public.messages(complaint_id);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ==== FEEDBACK ====
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(complaint_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ==== NOTIFICATIONS ====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_receiver ON public.notifications(receiver);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ==== POLICIES ====
-- profiles: user reads/updates own; admins & agents can read all (agents need names for assignments)
CREATE POLICY "profiles_select_self_or_staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- user_roles: users see own roles; admins see all
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- complaints
CREATE POLICY "complaints_select" ON public.complaints FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_agent = auth.uid()
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "complaints_update" ON public.complaints FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_agent = auth.uid()
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR assigned_agent = auth.uid()
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "complaints_delete_admin" ON public.complaints FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- status history: readable if you can see the complaint; insertable by any authenticated (guarded by complaint access via trigger checks in app)
CREATE POLICY "status_history_select" ON public.complaint_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.complaints c WHERE c.id = complaint_id
      AND (c.created_by = auth.uid() OR c.assigned_agent = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "status_history_insert" ON public.complaint_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.complaints c WHERE c.id = complaint_id
      AND (c.created_by = auth.uid() OR c.assigned_agent = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

-- messages
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.complaints c WHERE c.id = complaint_id
      AND (c.created_by = auth.uid() OR c.assigned_agent = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender = auth.uid() AND EXISTS (
      SELECT 1 FROM public.complaints c WHERE c.id = complaint_id
        AND (c.created_by = auth.uid() OR c.assigned_agent = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );

-- feedback: only complaint owner can create, all involved can read
CREATE POLICY "feedback_select" ON public.feedback FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.complaints c WHERE c.id = complaint_id
      AND (c.created_by = auth.uid() OR c.assigned_agent = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "feedback_insert_owner" ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.created_by = auth.uid()
  ));
CREATE POLICY "feedback_update_owner_or_admin" ON public.feedback FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "feedback_delete_admin" ON public.feedback FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- notifications
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (receiver = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (receiver = auth.uid()) WITH CHECK (receiver = auth.uid());
CREATE POLICY "notif_insert_authenticated" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- ==== TRIGGERS ====
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_complaints_updated BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default 'user' role on signup; first admin by email
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));
  INSERT INTO public.profiles(id,email,name,phone,address)
  VALUES (NEW.id, NEW.email, v_name,
          NEW.raw_user_meta_data->>'phone',
          NEW.raw_user_meta_data->>'address');
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  -- Seed admin
  IF NEW.email = 'admin@complaints.gov' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Log status changes automatically
CREATE OR REPLACE FUNCTION public.log_complaint_status_change() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_status_history(complaint_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by, 'Complaint created');
    INSERT INTO public.notifications(receiver, message, link)
    VALUES (NEW.created_by, 'Your complaint "'||NEW.title||'" has been submitted.', '/complaints/'||NEW.id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.complaint_status_history(complaint_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);
    INSERT INTO public.notifications(receiver, message, link)
    VALUES (NEW.created_by, 'Status of "'||NEW.title||'" changed to '||NEW.status, '/complaints/'||NEW.id);
  END IF;
  -- Notify agent on assignment
  IF TG_OP = 'UPDATE' AND NEW.assigned_agent IS DISTINCT FROM OLD.assigned_agent AND NEW.assigned_agent IS NOT NULL THEN
    INSERT INTO public.notifications(receiver, message, link)
    VALUES (NEW.assigned_agent, 'You were assigned complaint "'||NEW.title||'".', '/complaints/'||NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_complaint_insert_history
  AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_complaint_status_change();
CREATE TRIGGER trg_complaint_update_history
  AFTER UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_complaint_status_change();
