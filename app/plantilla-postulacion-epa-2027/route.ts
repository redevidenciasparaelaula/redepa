// Genera dinámicamente la plantilla Word (.docx) para completar la postulación
// antes de subirla al formulario. Los campos y textos de ayuda vienen de
// lib/abstract-fields.ts, las líneas temáticas de la DB y las metodologías
// de lib/methodologies.ts para mantenerse en sync con el formulario real.
//
// La ruta responde en GET /plantilla-postulacion-epa-2027 con un .docx
// forzado como descarga.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { DEFAULT_ABSTRACT_FIELDS, DEFAULT_SUBMISSION_MAX_CHARS } from '@/lib/abstract-fields';
import { getCongressBySlug } from '@/lib/queries';
import { methodologiesAlphabetical } from '@/lib/methodologies';

// La plantilla depende de la DB (tracks) y del catálogo — sin caché.
export const dynamic = 'force-dynamic';

function sectionHeading(number: number, label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [
      new TextRun({ text: `${number}. ${label}`, bold: true, size: 26 }),
    ],
  });
}

function hintLine(hint: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: hint, italics: true, color: '666666', size: 20 }),
    ],
  });
}

function placeholder(text: string = 'Escribe tu texto acá…'): Paragraph {
  return new Paragraph({
    spacing: { after: 240 },
    border: {
      top: { style: 'single', size: 4, color: 'CCCCCC' },
      bottom: { style: 'single', size: 4, color: 'CCCCCC' },
      left: { style: 'single', size: 4, color: 'CCCCCC' },
      right: { style: 'single', size: 4, color: 'CCCCCC' },
    },
    children: [
      new TextRun({ text, color: '999999', size: 22 }),
    ],
  });
}

function p(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number; color?: string; after?: number } = {}
): Paragraph {
  return new Paragraph({
    spacing: { after: opts.after ?? 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        size: opts.size ?? 22,
        color: opts.color,
      }),
    ],
  });
}

// Ítem de checklist con cuadrito (☐) al inicio. Word y Google Docs lo
// renderizan como caracter Unicode; visualmente se lee como casilla.
function checkItem(text: string, opts: { after?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: opts.after ?? 60 },
    children: [
      new TextRun({ text: '☐  ', size: 22 }),
      new TextRun({ text, size: 22 }),
    ],
  });
}

// Opción de "tipo de presentación": nombre + explicación indentada.
function typeOption(label: string, description: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: '☐  ', size: 22 }),
        new TextRun({ text: label, bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 140 },
      indent: { left: 360 },
      children: [
        new TextRun({
          text: description,
          italics: true,
          color: '444444',
          size: 20,
        }),
      ],
    }),
  ];
}

export async function GET() {
  const softLimit = DEFAULT_SUBMISSION_MAX_CHARS;

  // Cargar líneas temáticas reales del congreso 2027 y metodologías del catálogo.
  const [congress, methodologies] = await Promise.all([
    getCongressBySlug('epa-2027').catch(() => null),
    Promise.resolve(methodologiesAlphabetical('es')),
  ]);
  const tracks = (congress?.tracks ?? []).map((t) => t.name);

  const doc = new Document({
    creator: 'Red EPA',
    title: 'Plantilla de postulación · Congreso EPA 2027',
    description:
      'Documento auxiliar para trabajar el texto antes de subirlo al formulario oficial de postulación.',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Congreso EPA 2027', bold: true, size: 20, color: '666666' }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
            children: [
              new TextRun({ text: 'Plantilla de postulación', bold: true, size: 40 }),
            ],
          }),

          p(
            'Esta plantilla te ayuda a trabajar el texto de tu postulación con calma. Cuando lo tengas listo, copia y pega el contenido de cada sección en el formulario en línea: no se aceptan envíos por correo, PDF ni archivos Word.',
            { italics: true, color: '444444', after: 180 }
          ),

          p('Reglas importantes', { bold: true, size: 24, after: 80 }),
          p('• Solo en español.', { after: 40 }),
          p(
            '• Revisión doble ciega: no menciones tu nombre, ni el de tus coautores, ni tu institución dentro del texto del abstract.',
            { after: 40 }
          ),
          p(
            `• Recomendado hasta ${softLimit} caracteres por sección del abstract (se avisa si te pasas, pero no se bloquea).`,
            { after: 40 }
          ),
          p('• Puedes guardar borradores en el formulario y editarlos hasta la fecha de cierre.', {
            after: 240,
          }),

          sectionHeading(1, 'Título'),
          hintLine('Título descriptivo del trabajo. Máximo 300 caracteres.'),
          placeholder(),

          sectionHeading(2, 'Línea temática'),
          hintLine(
            'Marca la línea que mejor calza con tu trabajo. En el formulario en línea eliges una sola opción del listado.'
          ),
          ...(tracks.length > 0
            ? tracks.map((name) => checkItem(name))
            : [
                p(
                  '(No se pudieron cargar las líneas temáticas — consulta el listado en el formulario en línea.)',
                  { italics: true, color: '999999', after: 120 }
                ),
              ]),

          sectionHeading(3, 'Tipo de presentación'),
          hintLine('Marca el formato que prefieres. Se elige en el formulario en línea.'),
          ...typeOption(
            'Ponencia oral',
            'Exposición en vivo ante un auditorio en una sesión temática (~15 min + preguntas). Ideal para trabajos con hallazgos claros que se benefician de discusión con la audiencia.'
          ),
          ...typeOption(
            'Póster',
            'Presentación visual (formato A0/A1) en una sesión de pósters, con conversaciones cara a cara con quienes se interesen. Ideal para trabajos en curso, propuestas metodológicas o cuando quieres feedback más personalizado.'
          ),

          new Paragraph({
            spacing: { before: 360, after: 120 },
            children: [
              new TextRun({ text: 'Abstract estructurado', bold: true, size: 28 }),
            ],
          }),
          p(
            `Cada campo tiene un mínimo de 50 caracteres y un máximo recomendado de ${softLimit}.`,
            { italics: true, color: '666666', after: 200 }
          ),

          ...DEFAULT_ABSTRACT_FIELDS.flatMap((f, i) => [
            sectionHeading(4 + i, f.label),
            hintLine(f.hint),
            placeholder(),
          ]),

          sectionHeading(9, 'Palabras clave'),
          hintLine('Separadas por coma. Mínimo 2, recomendado 5.'),
          placeholder('ej. lectura, primaria, retroalimentación formativa'),

          sectionHeading(10, 'Metodologías principales'),
          hintLine(
            'Marca las que mejor describan tu trabajo. En el formulario en línea seleccionas mínimo 1 y máximo 3.'
          ),
          ...methodologies.map((m) => checkItem(m.es)),

          sectionHeading(11, 'Autoras y autores'),
          hintLine(
            'Los datos de autoría se agregan directamente en el formulario en línea y no forman parte del texto del abstract. El primer autor aparece como principal.'
          ),
          p('Anota acá los coautores para tenerlos a mano al llenar el formulario:', {
            after: 60,
          }),
          placeholder(
            'Nombre completo · correo · institución · rol (principal / coautor / presenta)'
          ),

          new Paragraph({
            spacing: { before: 400, after: 100 },
            children: [
              new TextRun({
                text: '→ Cuando tengas todo listo, ingresa al formulario en línea y pega el contenido de cada sección en el campo correspondiente.',
                bold: true,
                size: 22,
              }),
            ],
          }),
          p('redepa.net/congreso/2027/postular', {
            italics: true,
            color: '666666',
            after: 0,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition':
        'attachment; filename="plantilla-postulacion-epa-2027.docx"',
      'Cache-Control': 'no-store',
    },
  });
}
