import { StudioData } from '../types';

export const DEFAULT_APPS_SCRIPT_URL = 
  import.meta.env.VITE_DEFAULT_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbxVzW2yRCNDbPAlNW95B0MTbD2mD6ZXaGGBnMyVIPyj1n9Jgf_ho7RLWI_H5Badu4g/exec";

export const CACHE_KEY = "rami_hendi_visual_studio_cms_cache_v1";
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

function parsePortfolioFolders(parentFolderId) {
  const parent = DriveApp.getFolderById(parentFolderId);
  const subFolders = parent.getFolders();
  const categories = [];
  while (subFolders.hasNext()) {
    const folder = subFolders.next();
    const rawName = folder.getName();
    const cleanName = rawName.replace(/^\\d+[_-\\s]*/, '');
    const files = folder.getFiles();
    const items = [];
    while (files.hasNext()) {
      const file = files.next();
      const mime = file.getMimeType();
      const id = file.getId();
      const title = file.getName().replace(/\\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      if (mime.startsWith('image/')) {
        items.push({
          id, title, description: file.getDescription() || '', type: 'image',
          thumbUrl: \`https://drive.google.com/thumbnail?id=\${id}&sz=w1000\`,
          fullUrl: \`https://drive.google.com/thumbnail?id=\${id}&sz=s4000\`
        });
      } else if (mime.startsWith('video/')) {
        items.push({
          id, title, description: file.getDescription() || '', type: 'video',
          thumbUrl: \`https://drive.google.com/thumbnail?id=\${id}&sz=w1000\`,
          embedUrl: \`https://drive.google.com/file/d/\${id}/preview\`
        });
      }
    }
    items.sort((a, b) => a.title.localeCompare(b.title));
    categories.push({ rawOrder: rawName, category: cleanName, items });
  }
  categories.sort((a, b) => a.rawOrder.localeCompare(b.rawOrder));
  return categories;
}`;

export const DEMO_STUDIO_DATA: StudioData = {
  studioName: "Rami Hendi's Visual Studio",
  updatedAt: new Date().toISOString(),
  cvPdfUrl: "https://docs.google.com/document/d/DEMO_DOC_ID/export?format=pdf",
  cv: [
    { kind: "paragraph", heading: "TITLE", text: "Rami Hendi" },
    { kind: "paragraph", heading: "SUBTITLE", text: "Senior 3D Visualizer, Architectural Renderer & Technical Artist | 6+ Years Experience" },
    
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
  portfolio: [
    {
      rawOrder: "01_Architectural_Visualization",
      category: "Architectural Visualization",
      items: [
        {
          id: "demo-arch-1",
          title: "Minimalist Concrete Villa at Dusk",
          description: "Modeled in 3ds Max, rendered with Corona Renderer 11. Custom dusk HDRI sky dome with warm interior architectural lighting.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=90"
        },
        {
          id: "demo-arch-2",
          title: "Glass Pavilion & Infinity Pool Courtyard",
          description: "Exterior daylight study featuring realistic water caustics, botanical scattering, and weathered travertine stone shaders.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=90"
        },
        {
          id: "demo-arch-3",
          title: "Nordic Timber & Cantilever Residence",
          description: "Atmospheric overcast mood study using V-Ray 6, Forest Pack environment scattering, and 32-bit EXR tone mapping.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2400&q=90"
        }
      ]
    },
    {
      rawOrder: "02_Interior_&_Kitchen_Design",
      category: "Interior & Kitchen Design",
      items: [
        {
          id: "demo-int-1",
          title: "Bespoke Matte Obsidian & Walnut Kitchen Island",
          description: "Precision cabinetry visualization created from manufacturing dimensions. Brushed brass fixtures, Nero Marquina marble veining, and integrated LED strip lighting.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=2400&q=90"
        },
        {
          id: "demo-int-2",
          title: "Double-Height Penthouse Living Lounge",
          description: "Soft natural window light balance using Corona LightMix, custom bouclé fabric micro-displacement, and architectural acoustic wall panels.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2400&q=90"
        },
        {
          id: "demo-int-3",
          title: "Minimalist Marble Culinary Studio",
          description: "Designed for modular kitchen production catalog. Clean studio softbox reflections and accurate wood grain UV orientation.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=2400&q=90"
        },
        {
          id: "demo-int-4",
          title: "Warm Japandi Master Suite & Wardrobe",
          description: "Fluted oak joinery, warm 2700K concealed cove lighting, and physically based linen shaders in 3ds Max & Corona.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=2400&q=90"
        }
      ]
    },
    {
      rawOrder: "03_Product_&_3D_Modeling",
      category: "Product & 3D Modeling",
      items: [
        {
          id: "demo-prod-1",
          title: "Precision Mechanical Assembly & Studio Lighting",
          description: "CAD engineered in Autodesk Inventor, retopologized and rendered in Blender Cycles with anisotropic brushed aluminum shaders.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=2400&q=90"
        },
        {
          id: "demo-prod-2",
          title: "Sculptural Designer Lounge Chair Study",
          description: "Subdivision surface modeling in 3ds Max with custom stitched leather normal maps and studio rim lighting.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=2400&q=90"
        },
        {
          id: "demo-prod-3",
          title: "Industrial Pendant Luminaire Close-Up",
          description: "Macro depth-of-field product render showcasing knurled brass hardware and frosted borosilicate glass refraction.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=2400&q=90"
        }
      ]
    },
    {
      rawOrder: "04_Animations_&_Technical_Tools",
      category: "Animations & Technical Tools",
      items: [
        {
          id: "demo-anim-1",
          title: "Architectural Flythrough & Lighting Time-Lapse Reel",
          description: "60fps camera sequence rendered in Corona & assembled in After Effects demonstrating sun-study transition from noon to blue hour.",
          type: "video",
          thumbUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=85",
          embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
        },
        {
          id: "demo-anim-2",
          title: "Python & MaxScript Batch Material & Proxy Automator",
          description: "Custom automation utility built to batch-convert CAD blocks into Corona Proxies and standardize PBR texture paths.",
          type: "image",
          thumbUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=85",
          fullUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2400&q=90"
        }
      ]
    }
  ]
};
