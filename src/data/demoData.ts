import { StudioData } from '../types';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxVzW2yRCNDbPAlNW95B0MTbD2mD6ZXaGGBnMyVIPyj1n9Jgf_ho7RLWI_H5Badu4g/exec';

export const DEMO_STUDIO_DATA: StudioData = {
  studioName: "Rami Hendi's Visual Studio",
  updatedAt: new Date().toISOString(),
  cvPdfUrl: 'https://docs.google.com/document/d/DEMO_DOC_ID/export?format=pdf',
  cv: [
    { kind: 'paragraph', heading: 'TITLE', text: 'Rami Hendi' },
    { kind: 'paragraph', heading: 'SUBTITLE', text: '3D Artist (Generalist) | 15+ Years of Experience' },
    { kind: 'paragraph', heading: 'HEADING1', text: 'Executive Summary & Studio Profile' },
    {
      kind: 'paragraph',
      heading: 'NORMAL',
      text: 'Multi-disciplinary 3D Visualizer, Architectural Renderer, and Technical Artist specializing in photorealistic exterior and interior architectural visualization, bespoke kitchen and cabinetry systems, mechanical product rendering, and custom Python / MaxScript workflow automation. Proven track record of translating complex CAD/BIM blueprints into cinematic lighting studies and 4K marketing visuals.',
    },
    { kind: 'paragraph', heading: 'HEADING1', text: 'Work Experience & Studio Leadership' },
    {
      kind: 'paragraph',
      heading: 'HEADING2',
      text: "Founder & Lead 3D Visualizer — Rami Hendi's Visual Studio | 2022 – Present",
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Directed end-to-end 3D architectural visualization, photorealistic lighting, and material look-development for residential villas, commercial facades, and high-end interior spaces using 3ds Max, Corona Renderer, and V-Ray.',
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Engineered automated scene preparation, batch proxy generation, and asset management utilities in Python and MaxScript, cutting studio render turnaround times by 35%.',
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Delivered precision parametric 3D product visualizations and modular kitchen assemblies using Autodesk Inventor and Blender.',
    },
    {
      kind: 'paragraph',
      heading: 'HEADING2',
      text: 'Senior Interior & Kitchen 3D Visualizer — Design & Engineering Practice | 2020 – 2022',
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Produced over 150+ photorealistic kitchen, wardrobe, and luxury residential interior renders with physically accurate PBR shaders, custom woodwork detailing, and atmospheric lighting.',
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Collaborated directly with architects, fabrication engineers, and clients to bridge aesthetic concepts with manufacturable CAD specifications.',
    },
    {
      kind: 'paragraph',
      heading: 'HEADING2',
      text: '3D Artist & CAD Visualizer — Architectural Visualization Studio | 2018 – 2020',
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Modeled detailed architectural exteriors, hardscape environments, and custom furniture pieces from AutoCAD plans and elevations.',
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Executed post-production grading, camera matching, and compositing workflows for real estate developer presentations.',
    },
    { kind: 'paragraph', heading: 'HEADING1', text: 'Software & Technical Skills' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'Autodesk 3ds Max (Advanced Modeling & Scene Assembly)' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'Chaos Corona Renderer (Photorealistic Lighting & Shading)' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'Chaos V-Ray (Architectural & Studio Rendering)' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'Blender 3D (Procedural Shading, Geometry Nodes & Cycles)' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'Autodesk Inventor & AutoCAD (Mechanical & Parametric CAD)' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'Python & MaxScript (Pipeline Automation & Custom Tools)' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'Adobe Photoshop & After Effects (EXR Compositing & Grading)' },
    { kind: 'bullet', heading: 'LIST_ITEM', text: 'PBR Texturing, UV Unwrapping & HDRI Lighting Studio Setup' },
    { kind: 'paragraph', heading: 'HEADING1', text: 'Education & Technical Certifications' },
    {
      kind: 'paragraph',
      heading: 'HEADING2',
      text: "Bachelor's Degree & Specialized Training in 3D Visualization & CAD Engineering",
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Certified Professional in 3ds Max Architectural Visualization, Lighting Physics, and Parametric CAD Modeling.',
    },
    {
      kind: 'bullet',
      heading: 'LIST_ITEM',
      text: 'Continuous R&D in real-time rendering pipelines, automated cloud CMS architecture, and procedural shader authoring.',
    },
  ],
  portfolio: [],
};
