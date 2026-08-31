// Genera dinámicamente la plantilla Word (.docx) para completar la postulación
// antes de subirla al formulario. Los campos y textos de ayuda vienen de
// lib/abstract-fields.ts para mantenerse en sync con el formulario real.
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

// La plantilla es determinística pero pequeña; dejamos que se genere on-demand
// y el CDN de Vercel la cachea vía Cache-Control.
export const dynamic = 'force-dynamic';

// Estilo de un título de sección (número + label + hint gris)
function sectionHeading(number: number, label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [
      new TextRun({
        text: `${number}. ${label}`,
        bold: true,
        size: 26, // 13pt
      }),
    ],
  });
}

function hintLine(hint: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: hint,
        italics: true,
        color: '666666',
        size: 20, // 10pt
      }),
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
      new TextRun({
        text,
        color: '999999',
        size: 22,
      }),
    ],
  });
}

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string; after?: number } = {}): Paragraph {
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

export async function GET() {
  const softLimit = DEFAULT_SUBMISSION_MAX_CHARS;

  const doc = new Document({
    creator: 'Red EPA',
    title: 'Plantilla de postulación · Congreso EPA 2027',
    description:
      'Documento auxiliar para trabajar el texto antes de subirlo al formulario oficial de postulación.',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 }, // 11pt
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        children: [
          // ================= Encabezado =================
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Congreso EPA 2027',
                bold: true,
                size: 20,
                color: '666666',
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'Plantilla de postulación',
                bold: true,
                size: 40, // 20pt
              }),
            ],
          }),

          p(
            'Esta plantilla te ayuda a trabajar el texto de tu postulación con calma. Cuando lo tengas listo, copia y pega el contenido de cada sección en el formulario en línea: no se aceptan envíos por correo, PDF ni archivos Word.',
            { italics: true, color: '444444', after: 180 }
          ),

          // ================= Reglas =================
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

          // ================= Datos básicos =================
          sectionHeading(1, 'Título'),
          hintLine('Título descriptivo del trabajo. Máximo 300 caracteres.'),
          placeholder(),

          sectionHeading(2, 'Línea temática'),
          hintLine(
            'Selecciona en el formulario en línea la línea temática que mejor calza con tu trabajo.'
          ),
          placeholder('Escribe acá la línea temática elegida (referencial).'),

          sectionHeading(3, 'Tipo de presentación'),
          hintLine('Oral, póster o simposio. Se elige en el formulario en línea.'),
          placeholder('Escribe acá el tipo elegido (referencial).'),

          // ================= Abstract estructurado =================
          new Paragraph({
            spacing: { before: 360, after: 120 },
            children: [
              new TextRun({
                text: 'Abstract estructurado',
                bold: true,
                size: 28,
              }),
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

          // ================= Palabras clave =================
          sectionHeading(9, 'Palabras clave'),
          hintLine('Separadas por coma. Mínimo 2, recomendado 5.'),
          placeholder('ej. lectura, primaria, retroalimentación formativa'),

          // ================= Metodologías =================
          sectionHeading(10, 'Metodologías principales'),
          hintLine(
            'Selecciona en el formulario en línea las que mejor describan tu trabajo. Mínimo 1, máximo 3.'
          ),
          placeholder('Escribe acá las metodologías elegidas (referencial).'),

          // ================= Autoría =================
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

          // ================= Cierre =================
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
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
