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
  const result = await requireSupabase()
    .from('drugs')
    .insert({
      name: input.name.trim(),
      generic_name: input.genericName.trim(),
      strength: input.strength.trim(),
      unit: input.unit.trim(),
      price: input.price,
      color_tag: input.colorTag || null,
    })
    .select()
    .single();
  if (result.error) throw result.error;
  return mapDrug(result.data as DrugRow);
}

export async function updateDrug(id: string, input: UpdateDrugInput): Promise<Drug> {
  const patch: Partial<DrugRow> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.genericName !== undefined) patch.generic_name = input.genericName.trim();
  if (input.strength !== undefined) patch.strength = input.strength.trim();
  if (input.unit !== undefined) patch.unit = input.unit.trim();
  if (input.price !== undefined) patch.price = input.price;
  if (input.colorTag !== undefined) patch.color_tag = input.colorTag || null;
  if (input.active !== undefined) patch.active = input.active;

  const result = await requireSupabase()
    .from('drugs')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (result.error) throw result.error;
  return mapDrug(result.data as DrugRow);
}

export async function deleteDrug(id: string): Promise<void> {
  const result = await requireSupabase().from('drugs').delete().eq('id', id);
  if (result.error) throw result.error;
}
