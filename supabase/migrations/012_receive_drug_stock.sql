-- 012_receive_drug_stock.sql
-- เพิ่ม received_qty เพื่อ track partial fulfillment ต่อ item

ALTER TABLE public.backorder_items
  ADD COLUMN IF NOT EXISTS received_qty numeric NOT NULL DEFAULT 0
  CONSTRAINT backorder_items_received_qty_nonneg CHECK (received_qty >= 0);

CREATE OR REPLACE FUNCTION public.receive_drug_stock(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor         uuid;
  p_drug_name   text    := btrim(coalesce(payload->>'drugName', ''));
  p_unit        text    := btrim(coalesce(payload->>'unit', ''));
  p_qty         numeric;
  r             record;
  remaining     numeric;
  give          numeric;
  qty_allocated numeric := 0;
  touched_ids   uuid[]  := '{}';
  ready_ids     uuid[]  := '{}';
  partial_ids   uuid[]  := '{}';
  tid           uuid;
  all_fulfilled boolean;
BEGIN
  actor := public.assert_active_staff();

  IF p_drug_name = '' THEN
    RAISE EXCEPTION 'drugName is required' USING ERRCODE = '22023';
  END IF;

  BEGIN
    p_qty := (payload->>'qtyReceived')::numeric;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'qtyReceived must be a number' USING ERRCODE = '22023';
  END;

  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'qtyReceived must be greater than 0' USING ERRCODE = '22023';
  END IF;

  remaining := p_qty;

  -- FIFO: lock items ordered by ticket creation date
  FOR r IN
    SELECT bi.id AS item_id, bi.ticket_id, bi.qty, bi.received_qty
    FROM public.backorder_items bi
    JOIN public.backorder_tickets bt ON bt.id = bi.ticket_id
    WHERE lower(btrim(bi.drug_name)) = lower(p_drug_name)
      AND btrim(bi.unit)             = p_unit
      AND bt.status                  = 'preparing'
      AND bi.qty - bi.received_qty   > 0
    ORDER BY bt.created_at ASC, bt.id ASC
    FOR UPDATE OF bi
  LOOP
    EXIT WHEN remaining <= 0;

    give          := LEAST(r.qty - r.received_qty, remaining);
    remaining     := remaining - give;
    qty_allocated := qty_allocated + give;

    UPDATE public.backorder_items
       SET received_qty = received_qty + give
     WHERE id = r.item_id;

    IF NOT (r.ticket_id = ANY(touched_ids)) THEN
      touched_ids := array_append(touched_ids, r.ticket_id);
    END IF;
  END LOOP;

  -- ตรวจแต่ละ ticket ที่ถูก touch: ถ้าทุก item ครบ → ready
  FOREACH tid IN ARRAY touched_ids LOOP
    SELECT bool_and(received_qty >= qty)
      INTO all_fulfilled
      FROM public.backorder_items
     WHERE ticket_id = tid;

    IF all_fulfilled THEN
      UPDATE public.backorder_tickets
         SET status     = 'ready',
             ready_at   = now(),
             ready_by   = actor,
             updated_by = actor
       WHERE id = tid;

      INSERT INTO public.audit_logs
        (ticket_id, ticket_no, action, old_status, new_status, actor_id, actor_type, detail)
      SELECT id, ticket_no,
             'update_status', 'preparing', 'ready',
             actor, 'staff',
             jsonb_build_object('source', 'drug_receipt',
                                'drugName', p_drug_name,
                                'unit', p_unit)
        FROM public.backorder_tickets WHERE id = tid;

      ready_ids := array_append(ready_ids, tid);
    ELSE
      partial_ids := array_append(partial_ids, tid);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'readyTicketIds',   to_jsonb(ready_ids),
    'partialTicketIds', to_jsonb(partial_ids),
    'qtyAllocated',     qty_allocated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_drug_stock(jsonb) TO authenticated;
