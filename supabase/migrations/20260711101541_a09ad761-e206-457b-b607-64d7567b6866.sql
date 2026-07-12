
-- Storage policies for complaint-attachments bucket
-- Files stored as: <user_id>/<complaint_id>/<filename>
CREATE POLICY "attachments_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'complaint-attachments');

CREATE POLICY "attachments_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'complaint-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "attachments_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'complaint-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "attachments_delete_own_or_admin" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'complaint-attachments'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin'))
  );
