// Tipos compartidos entre el server action de bulk insert y el UI cliente.

export interface BulkRow {
  full_name: string;
  email: string;
  title_es: string;
  title_en: string | null;
  country: string;
  city: string;
  research_topics: string[];
  methodologies: string[];
  phd_year: number | null;
  phd_institution: string | null;
  master_year: number | null;
  master_institution: string | null;
  linkedin_url: string | null;
  google_scholar_url: string | null;
  researchgate_url: string | null;
  orcid: string | null;
  website: string | null;
  representative_dois: string[];
}

export interface BulkInsertedRow {
  email: string;
  password: string;
  createdAuthUser: boolean;
}

export interface BulkInsertResult {
  inserted: number;
  errors: { row: number; email: string; message: string }[];
  credentials: BulkInsertedRow[];
}
