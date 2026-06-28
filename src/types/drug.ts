export type Drug = {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  unit: string;
  price: number | null;
  colorTag: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CreateDrugInput = {
  name: string;
  genericName: string;
  strength: string;
  unit: string;
  price: number | null;
  colorTag: string | null;
};

export type UpdateDrugInput = Partial<CreateDrugInput> & { active?: boolean };
