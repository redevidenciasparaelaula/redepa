// Contenido editorial del sitio Red EPA (Visión, Misión, Valores, Miembros, Directiva, etc.)
// Centralizado acá para que actualizarlo no requiera tocar componentes.

export interface Member {
  name: string;
  logo: string;
  country?: string;
}

// Miembros de la red (logos en public/logos/). Orden visual.
export const MEMBERS: Member[] = [
  { name: 'Escuela Normal de Amecameca', logo: '/logos/amecameca.png', country: 'México' },
  { name: 'Universidade de Brasília', logo: '/logos/brasilia.png', country: 'Brasil' },
  { name: 'Pontificia Universidad Católica del Perú', logo: '/logos/pucp.png', country: 'Perú' },
  { name: 'Universidad Católica del Uruguay', logo: '/logos/ucu.png', country: 'Uruguay' },
  { name: 'CIAE — Universidad de Chile', logo: '/logos/ciae.png', country: 'Chile' },
  { name: 'Universidad San Sebastián', logo: '/logos/uss.png', country: 'Chile' },
  { name: 'Pontificia Universidad Católica de Chile', logo: '/logos/puc-chile.png', country: 'Chile' },
  { name: 'Universidad Finis Terrae', logo: '/logos/finis-terrae.png', country: 'Chile' },
  { name: 'Universidad del Desarrollo', logo: '/logos/udd.png', country: 'Chile' },
  { name: 'Universidad Academia de Humanismo Cristiano', logo: '/logos/uahc.png', country: 'Chile' },
  { name: 'Universidad ORT Uruguay', logo: '/logos/ort.png', country: 'Uruguay' },
  { name: 'Universidad de las Américas', logo: '/logos/udla.png', country: 'Chile' },
  { name: 'Universidad Santo Tomás', logo: '/logos/ust.png', country: 'Chile' },
  { name: 'Universidad Alberto Hurtado', logo: '/logos/uah.png', country: 'Chile' },
  { name: 'Universidad de los Andes', logo: '/logos/uandes.png', country: 'Chile' },
  { name: 'Universidad Bernardo O’Higgins', logo: '/logos/ubo.png', country: 'Chile' },
  { name: 'Universidad Católica Silva Henríquez', logo: '/logos/ucsh.png', country: 'Chile' },
  { name: 'Universidad Católica de Temuco', logo: '/logos/uct.png', country: 'Chile' },
  { name: 'Universidad Diego Portales', logo: '/logos/udp.png', country: 'Chile' },
  { name: 'Universidad de La Sabana', logo: '/logos/sabana.png', country: 'Colombia' },
];

export interface BoardMember {
  name: string;
  affiliation: string;
  photo: string;
}

export const BOARD: BoardMember[] = [
  {
    name: 'Alejandra Balbi',
    affiliation: 'Universidad Católica de Uruguay',
    photo: '/board/alejandra-balbi.jpg',
  },
  {
    name: 'Montserrat Cubillos',
    affiliation: 'Universidad del Desarrollo (Chile)',
    photo: '/board/montserrat-cubillos.jpg',
  },
  {
    name: 'Paulina Guzmán',
    affiliation: 'Universidad San Sebastián (Chile)',
    photo: '/board/paulina-guzman.jpg',
  },
  {
    name: 'Cristián Fuentes',
    affiliation: 'Escuela Normal de Amecameca (México)',
    photo: '/board/cristian-fuentes.jpg',
  },
  {
    name: 'Farzaneh Saadati',
    affiliation: 'CIAE (Chile)',
    photo: '/board/farzaneh-saadati.jpg',
  },
];

export const VALUES: string[] = [
  'Colaboración',
  'Transparencia',
  'Excelencia',
  'Respeto a la diversidad institucional',
  'Enfoque en impacto educativo',
  'No exclusividad',
];

export const VISION =
  'Liderar la integración entre la academia y el aula en la región, asegurando que la práctica pedagógica y las políticas educativas estén fundamentadas en la investigación para garantizar el aprendizaje de todos los estudiantes.';

export const MISSION =
  'Articular universidades y centros de investigación, principalmente de América Latina, en una red de colaboración orientada a generar, compartir y transferir conocimiento educativo relevante, fortaleciendo la investigación, la innovación pedagógica, la formación docente y la incidencia informada en la política pública y en el sistema escolar.';

export const TAGLINE =
  'La Red Evidencias para el Aula (EPA) articula universidades y centros de investigación en educación para colaborar en iniciativas de investigación, docencia, innovación e incidencia pública, con el objetivo de que academia y aula se retroalimenten mutuamente.';

export const CONTACT_EMAIL = 'redevidenciasparaelaula@gmail.com';
