import { StudioData } from '../types';

export const DEFAULT_APPS_SCRIPT_URL = 
  "https://script.google.com/macros/s/AKfycbxVzW2yRCNDbPAlNW95B0MTbD2mD6ZXaGGBnMyVIPyj1n9Jgf_ho7RLWI_H5Badu4g/exec";

export const CACHE_KEY = "rami_hendi_visual_studio_cms_cache_v2";
export const SAVED_URL_KEY = "rami_hendi_custom_apps_script_url";

export const APPS_SCRIPT_TEMPLATE = `const CV_DOC_ID = 'PASTE_YOUR_GOOGLE_DOC_ID_HERE';
const PORTFOLIO_FOLDER_ID = 'PASTE_YOUR_PORTFOLIO_FOLDER_ID_HERE';

function doGet() {
  const output = {
    studioName: "Rami Hendi's Visual Studio",
    updatedAt: new Date().toISOString(),
    cvPdfUrl: \`https://docs.google.com/document/d/\${CV_DOC_ID}/export?format=pdf\`,
    cv: parseCVDoc(CV_DOC_ID),
    portfolio: parsePortfolioFolders(PORTFOLIO_FOLDER_ID)
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseCVDoc(docId) {
  const body = DocumentApp.openById(docId).getBody();
  const elements = [];
  for (let i = 0; i < body.getNumChildren(); i++) {
    const child = body.getChild(i);
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const p = child.asParagraph();
      if (p.getText().trim()) {
        elements.push({ kind: 'paragraph', heading: p.getHeading().toString(), text: p.getText().trim() });
      }
    } else if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
      const li = child.asListItem();
      if (li.getText().trim()) {
        elements.push({ kind: 'bullet', heading: 'LIST_ITEM', text: li.getText().trim() });
      }
    }
  }
  return elements;
}

function parseMediaFilesInFolder(folder, projectMeta) {
  const files = folder.getFiles();
  const fileList = [];
  while (files.hasNext()) {
    fileList.push(files.next());
  }
  fileList.sort((a, b) => a.getName().localeCompare(b.getName(), undefined, { numeric: true }));

  const items = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const mime = file.getMimeType();
    const id = file.getId();
    const rawTitle = file.getName().replace(/\\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const desc = file.getDescription() || '';
    const isFeatured =
      /\\[featured\\]/i.test(rawTitle) ||
      /#featured/i.test(desc) ||
      /featured:\\s*true/i.test(desc);

    const baseItem = {
      id: id,
      title: rawTitle,
      description: desc.replace(/#featured/gi, '').replace(/featured:\\s*true/gi, '').trim(),
      featured: isFeatured
    };

    if (projectMeta) {
      baseItem.projectId = projectMeta.id;
      baseItem.projectName = projectMeta.name;
    }

    if (mime.startsWith('image/')) {
      items.push(Object.assign(baseItem, {
        type: 'image',
        thumbUrl: \`https://drive.google.com/thumbnail?id=\${id}&sz=w1000\`,
        fullUrl: \`https://drive.google.com/thumbnail?id=\${id}&sz=s4000\`
      }));
    } else if (mime.startsWith('video/')) {
      items.push(Object.assign(baseItem, {
        type: 'video',
        thumbUrl: \`https://drive.google.com/thumbnail?id=\${id}&sz=w1000\`,
        embedUrl: \`https://drive.google.com/file/d/\${id}/preview\`
      }));
    }
  }
  return items;
}

function parsePortfolioFolders(parentFolderId) {
  const parent = DriveApp.getFolderById(parentFolderId);
  const categoryFolders = parent.getFolders();
  const categories = [];

  while (categoryFolders.hasNext()) {
    const catFolder = categoryFolders.next();
    const rawOrder = catFolder.getName();
    const cleanCategory = rawOrder.replace(/^\\d+[_-\\s]*/, '').replace(/_/g, ' ').trim();

    // 1. Scan project subfolders inside this category folder
    const projectFolders = catFolder.getFolders();
    const projects = [];

    while (projectFolders.hasNext()) {
      const projFolder = projectFolders.next();
      const projRawName = projFolder.getName();
      const projDesc = projFolder.getDescription() || '';
      const projName = projRawName
        .replace(/^\\d+[_-\\s]*/, '')
        .replace(/\\[featured\\]/gi, '')
        .replace(/#featured/gi, '')
        .replace(/_/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();

      const projItems = parseMediaFilesInFolder(projFolder, {
        id: projFolder.getId(),
        name: projName
      });

      if (projItems.length > 0) {
        const projFeatured =
          /\\[featured\\]/i.test(projRawName) ||
          /#featured/i.test(projDesc) ||
          /featured:\\s*true/i.test(projDesc) ||
          projItems.some((item) => item.featured === true);

        const coverItem = projItems.find((item) => item.type === 'image') || projItems[0];

        projects.push({
          id: projFolder.getId(),
          rawOrder: projRawName,
          name: projName,
          description: projDesc.replace(/#featured/gi, '').replace(/featured:\\s*true/gi, '').trim(),
          featured: projFeatured,
          coverUrl: coverItem ? coverItem.thumbUrl : '',
          items: projItems
        });
      }
    }

    projects.sort((a, b) => a.rawOrder.localeCompare(b.rawOrder, undefined, { numeric: true }));

    // 2. Also keep any loose media files placed directly inside the category folder
    const looseItems = parseMediaFilesInFolder(catFolder, null);

    if (projects.length > 0 || looseItems.length > 0) {
      categories.push({
        rawOrder: rawOrder,
        category: cleanCategory,
        projects: projects,
        items: looseItems
      });
    }
  }

  categories.sort((a, b) => a.rawOrder.localeCompare(b.rawOrder, undefined, { numeric: true }));
  return categories;
}`;

export const DEMO_STUDIO_DATA: StudioData = {
  studioName: "Rami Hendi's Visual Studio",
  updatedAt: new Date().toISOString(),
  cvPdfUrl: "https://docs.google.com/document/d/DEMO_DOC_ID/export?format=pdf",
  cv: [
    { kind: "paragraph", heading: "TITLE", text: "Rami Hendi" },
    { kind: "paragraph", heading: "SUBTITLE", text: "3D Artist (Generalist) | 10+ Years of Experience" },
    
    { kind: "paragraph", heading: "HEADING1", text: "Executive Summary & Studio Profile" },
    { kind: "paragraph", heading: "NORMAL", text: "Multi-disciplinary 3D Visualizer, Architectural Renderer, and Technical Artist specializing in photorealistic exterior and interior architectural visualization, bespoke kitchen and cabinetry systems, mechanical product rendering, and custom Python / MaxScript workflow automation. Proven track record of translating complex CAD/BIM blueprints into cinematic lighting studies and 4K marketing visuals." },
    
    { kind: "paragraph", heading: "HEADING1", text: "Work Experience & Studio Leadership" },
    { kind: "paragraph", heading: "HEADING2", text: "Founder & Lead 3D Visualizer — Rami Hendi's Visual Studio | 2022 – Present" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Directed end-to-end 3D architectural visualization, photorealistic lighting, and material look-development for residential villas, commercial facades, and high-end interior spaces using 3ds Max, Corona Renderer, and V-Ray." },
    { kind: "bullet", heading: "LIST_ITEM", text: "Engineered automated scene preparation, batch proxy generation, and asset management utilities in Python and MaxScript, cutting studio render turnaround times by 35%." },
    { kind: "bullet", heading: "LIST_ITEM", text: "Delivered precision parametric 3D product visualizations and modular kitchen assemblies using Autodesk Inventor and Blender." },

    { kind: "paragraph", heading: "HEADING2", text: "Senior Interior & Kitchen 3D Visualizer — Design & Engineering Practice | 2020 – 2022" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Produced over 150+ photorealistic kitchen, wardrobe, and luxury residential interior renders with physically accurate PBR shaders, custom woodwork detailing, and atmospheric lighting." },
    { kind: "bullet", heading: "LIST_ITEM", text: "Collaborated directly with architects, fabrication engineers, and clients to bridge aesthetic concepts with manufacturable CAD specifications." },

    { kind: "paragraph", heading: "HEADING2", text: "3D Artist & CAD Visualizer — Architectural Visualization Studio | 2018 – 2020" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Modeled detailed architectural exteriors, hardscape environments, and custom furniture pieces from AutoCAD plans and elevations." },
    { kind: "bullet", heading: "LIST_ITEM", text: "Executed post-production grading, camera matching, and compositing workflows for real estate developer presentations." },

    { kind: "paragraph", heading: "HEADING1", text: "Software & Technical Skills" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Autodesk 3ds Max (Advanced Modeling & Scene Assembly)" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Chaos Corona Renderer (Photorealistic Lighting & Shading)" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Chaos V-Ray (Architectural & Studio Rendering)" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Blender 3D (Procedural Shading, Geometry Nodes & Cycles)" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Autodesk Inventor & AutoCAD (Mechanical & Parametric CAD)" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Python & MaxScript (Pipeline Automation & Custom Tools)" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Adobe Photoshop & After Effects (EXR Compositing & Grading)" },
    { kind: "bullet", heading: "LIST_ITEM", text: "PBR Texturing, UV Unwrapping & HDRI Lighting Studio Setup" },

    { kind: "paragraph", heading: "HEADING1", text: "Education & Technical Certifications" },
    { kind: "paragraph", heading: "HEADING2", text: "Bachelor's Degree & Specialized Training in 3D Visualization & CAD Engineering" },
    { kind: "bullet", heading: "LIST_ITEM", text: "Certified Professional in 3ds Max Architectural Visualization, Lighting Physics, and Parametric CAD Modeling." },
    { kind: "bullet", heading: "LIST_ITEM", text: "Continuous R&D in real-time rendering pipelines, automated cloud CMS architecture, and procedural shader authoring." }
  ],
  portfolio: []
};
