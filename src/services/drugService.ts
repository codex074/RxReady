import { requireSupabase } from '../lib/supabase';
import type { CreateDrugInput, Drug, UpdateDrugInput } from '../types/drug';

type DrugRow = {
  id: string;
  name: string;
  generic_name: string;
  strength: string;
  unit: string;
  price: number | null;
  color_tag: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function mapDrug(row: DrugRow): Drug {
  return {
    id: row.id,
    name: row.name,
    genericName: row.generic_name,
    strength: row.strength,
    unit: row.unit,
    price: row.price,
    colorTag: row.color_tag,
    active: row.active,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function listDrugs(): Promise<Drug[]> {
  const result = await requireSupabase()
    .from('drugs')
    .select('*')
    .order('name', { ascending: true });
  if (result.error) throw result.error;
  return ((result.data || []) as DrugRow[]).map(mapDrug);
}

export async function createDrug(input: CreateDrugInput): Promise<Drug> {
  const result = await requireSupabase().rpc('create_drug_with_audit', {
    payload: {
      name: input.name.trim(),
      genericName: input.genericName.trim(),
      strength: input.strength.trim(),
      unit: input.unit.trim(),
      price: input.price,
      colorTag: input.colorTag || null,
      active: true,
    },
  });
  if (result.error) throw result.error;
  return mapDrug(result.data as DrugRow);
}

export async function updateDrug(id: string, input: UpdateDrugInput): Promise<Drug> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.genericName !== undefined) payload.genericName = input.genericName.trim();
  if (input.strength !== undefined) payload.strength = input.strength.trim();
  if (input.unit !== undefined) payload.unit = input.unit.trim();
  if (input.price !== undefined) payload.price = input.price;
  if (input.colorTag !== undefined) payload.colorTag = input.colorTag || null;
  if (input.active !== undefined) payload.active = input.active;

  const result = await requireSupabase().rpc('update_drug_with_audit', {
    target_drug_id: id,
    payload,
  });
  if (result.error) throw result.error;
  return mapDrug(result.data as DrugRow);
}

export async function deleteDrug(id: string): Promise<void> {
  const result = await requireSupabase().rpc('delete_drug_with_audit', {
    target_drug_id: id,
  });
  if (result.error) throw result.error;
}
