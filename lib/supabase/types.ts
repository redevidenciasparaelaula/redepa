// Tipos manuales mínimos. Si más adelante usas la CLI de Supabase
// (`supabase gen types typescript`) puedes reemplazar este archivo
// con los tipos generados automáticamente.

export type ResearcherStatus = 'pending' | 'approved' | 'rejected';

export type Institution = {
  id: string;
  name: string;
  name_en: string | null;
  country: string;
  city: string | null;
  website: string | null;
  created_at: string;
};

export type Researcher = {
  id: string;
  full_name: string;
  email: string;
  institution_id: string | null;
  title_es: string | null;
  title_en: string | null;
  phd_year: number | null;
  phd_institution: string | null;
  master_year: number | null;
  master_institution: string | null;
  research_topics: string[];
  methodologies: string[];
  representative_dois: string[];
  country: string | null;
  city: string | null;
  linkedin_url: string | null;
  google_scholar_url: string | null;
  researchgate_url: string | null;
  orcid: string | null;
  website: string | null;
  photo_url: string | null;
  status: ResearcherStatus;
  created_at: string;
  updated_at: string;
};

export type ResearcherWithInstitution = Researcher & {
  institutions: Pick<Institution, 'id' | 'name' | 'name_en' | 'country' | 'city'> | null;
};

export type InstitutionAdmin = {
  user_id: string;
  institution_id: string;
  created_at: string;
};

export type SuperAdmin = {
  user_id: string;
  created_at: string;
};

// Para Insert: campos requeridos en NOT NULL sin default; el resto, opcionales.
type ResearcherInsert = Partial<Researcher> & {
  full_name: string;
  email: string;
};

type InstitutionInsert = Partial<Institution> & {
  name: string;
  country: string;
};

export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: Institution;
        Insert: InstitutionInsert;
        Update: Partial<Institution>;
        Relationships: [];
      };
      researchers: {
        Row: Researcher;
        Insert: ResearcherInsert;
        Update: Partial<Researcher>;
        Relationships: [
          {
            foreignKeyName: 'researchers_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      institution_admins: {
        Row: InstitutionAdmin;
        Insert: Partial<InstitutionAdmin> & {
          user_id: string;
          institution_id: string;
        };
        Update: Partial<InstitutionAdmin>;
        Relationships: [];
      };
      super_admins: {
        Row: SuperAdmin;
        Insert: Partial<SuperAdmin> & { user_id: string };
        Update: Partial<SuperAdmin>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_institution_admins: {
        Args: { p_institution_id: string };
        Returns: { user_id: string; email: string; created_at: string }[];
      };
      list_super_admins: {
        Args: Record<string, never>;
        Returns: { user_id: string; email: string; created_at: string }[];
      };
      add_institution_admin_by_email: {
        Args: { p_email: string; p_institution_id: string };
        Returns: string;
      };
      add_super_admin_by_email: {
        Args: { p_email: string };
        Returns: string;
      };
      merge_institutions: {
        Args: { p_source_id: string; p_target_id: string };
        Returns: void;
      };
    };
    Enums: {
      researcher_status: ResearcherStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
