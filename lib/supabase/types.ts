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
  available_for_review: boolean;
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

// =====================================================================
// Congresos (módulo de congreso EPA)
// Las demás tablas (submissions, reviews, sessions, etc.) se agregarán
// a medida que avancemos en las olas de implementación.
// =====================================================================

export type CongressStatus =
  | 'draft'
  | 'cfp_open'
  | 'review'
  | 'program'
  | 'live'
  | 'closed';

export type Congress = {
  id: string;
  year: number;
  name: string;
  slug: string;
  theme: string | null;
  start_date: string;
  end_date: string;
  cfp_open_at: string | null;
  cfp_close_at: string | null;
  notification_at: string | null;
  registration_open_at: string | null;
  status: CongressStatus;
  created_at: string;
  updated_at: string;
};

export type CongressSubscriber = {
  id: string;
  congress_id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type CongressTrack = {
  id: string;
  congress_id: string;
  name: string;
  description: string | null;
  chair_user_id: string | null;
  display_order: number;
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
      congresses: {
        Row: Congress;
        Insert: Partial<Congress> & {
          year: number;
          name: string;
          slug: string;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Congress>;
        Relationships: [];
      };
      congress_tracks: {
        Row: CongressTrack;
        Insert: Partial<CongressTrack> & {
          congress_id: string;
          name: string;
        };
        Update: Partial<CongressTrack>;
        Relationships: [
          {
            foreignKeyName: 'congress_tracks_congress_id_fkey';
            columns: ['congress_id'];
            isOneToOne: false;
            referencedRelation: 'congresses';
            referencedColumns: ['id'];
          },
        ];
      };
      congress_subscribers: {
        Row: CongressSubscriber;
        Insert: Partial<CongressSubscriber> & {
          congress_id: string;
          email: string;
        };
        Update: Partial<CongressSubscriber>;
        Relationships: [
          {
            foreignKeyName: 'congress_subscribers_congress_id_fkey';
            columns: ['congress_id'];
            isOneToOne: false;
            referencedRelation: 'congresses';
            referencedColumns: ['id'];
          },
        ];
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
      list_reviewer_pool: {
        Args: { p_congress_id: string };
        Returns: {
          user_id: string;
          email: string;
          max_load: number;
          topics: string[];
          methodologies: string[];
          active: boolean;
          assignments_count: number;
        }[];
      };
      add_reviewer_pool_entry_by_email: {
        Args: {
          p_email: string;
          p_congress_id: string;
          p_max_load: number;
          p_topics: string[];
          p_methodologies: string[];
        };
        Returns: string;
      };
      update_reviewer_pool_entry: {
        Args: {
          p_user_id: string;
          p_congress_id: string;
          p_max_load: number;
          p_topics: string[];
          p_methodologies: string[];
          p_active: boolean;
        };
        Returns: string;
      };
      remove_reviewer_pool_entry: {
        Args: { p_user_id: string; p_congress_id: string };
        Returns: string;
      };
      subscribe_to_congress: {
        Args: {
          p_congress_id: string;
          p_email: string;
          p_name?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      researcher_status: ResearcherStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
