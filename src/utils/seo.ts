import { MainTab, PortfolioProject } from '../types';

export interface DynamicSeoPayload {
  tab: MainTab;
  category?: string;
  projectTitle?: string;
  cvSection?: string;
  projects: PortfolioProject[];
}

const SITE_NAME = "Rami Hendi's Visual Studio";
const DEFAULT_TITLE = "Rami Hendi's Visual Studio – 3D Artist & ArchViz Portfolio";
const DEFAULT_DESCRIPTION =
  "Explore Rami Hendi's Visual Studio: photorealistic 3D architectural visualization, industrial design, CGI rendering, and interactive CV with 15+ years of experience.";
const CV_DESCRIPTION =
  "Curriculum Vitae of Rami Hendi, 3D Artist (Generalist) with 15+ years of experience in architectural visualization, industrial design, 3ds Max, V-Ray, Blender, and CAD.";

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(url: string): void {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function upsertJsonLd(id: string, data: Record<string, unknown>): void {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function syncPageSeo(payload: DynamicSeoPayload): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const cleanCategory = (payload.category || '').replace(/_/g, ' ').trim();
  const cleanProject = (payload.projectTitle || '').trim();
  const cleanCvSection = (payload.cvSection || '').trim();

  let pageTitle = DEFAULT_TITLE;
  let pageDescription = DEFAULT_DESCRIPTION;
  let canonicalUrl = baseUrl;

  if (payload.tab === 'cv') {
    pageTitle = cleanCvSection
      ? `Curriculum Vitae – ${cleanCvSection} | ${SITE_NAME}`
      : `Curriculum Vitae – Rami Hendi | 3D Artist & ArchViz Specialist`;
    pageDescription = CV_DESCRIPTION;
    canonicalUrl = `${baseUrl}?view=cv`;
  } else if (cleanProject) {
    pageTitle = cleanCategory
      ? `${cleanProject} – ${cleanCategory} | ${SITE_NAME}`
      : `${cleanProject} | ${SITE_NAME}`;
    pageDescription = `View ${cleanProject}${
      cleanCategory ? ` in ${cleanCategory}` : ''
    } — photorealistic 3D design and visualization by Rami Hendi.`;
  } else if (cleanCategory) {
    pageTitle = `${cleanCategory} | ${SITE_NAME}`;
    pageDescription = `Explore ${cleanCategory} projects by Rami Hendi: high-impact photorealistic 3D visualization, modeling, and CGI rendering.`;
  }

  document.title = pageTitle;
  upsertMeta('name', 'description', pageDescription);
  upsertMeta('property', 'og:title', pageTitle);
  upsertMeta('property', 'og:description', pageDescription);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('name', 'twitter:title', pageTitle);
  upsertMeta('name', 'twitter:description', pageDescription);
  upsertCanonical(canonicalUrl);

  const breadcrumbItems: Array<{
    '@type': string;
    position: number;
    name: string;
    item: string;
  }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Portfolio',
      item: baseUrl,
    },
  ];

  if (payload.tab === 'cv') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Curriculum Vitae',
      item: `${baseUrl}?view=cv`,
    });
    if (cleanCvSection) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: cleanCvSection,
        item: `${baseUrl}?view=cv`,
      });
    }
  } else {
    if (cleanCategory) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: cleanCategory,
        item: baseUrl,
      });
    }
    if (cleanProject) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: breadcrumbItems.length + 1,
        name: cleanProject,
        item: window.location.href,
      });
    }
  }

  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    },
  ];

  const namedProjects = payload.projects
    .filter((p) => p.isProjectGroup && p.name)
    .slice(0, 30);

  if (namedProjects.length > 0) {
    graph.push({
      '@type': 'ItemList',
      name: `${SITE_NAME} — Selected 3D & Architectural Visualization Projects`,
      numberOfItems: namedProjects.length,
      itemListElement: namedProjects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'CreativeWork',
          name: project.name,
          genre: (project.category || '3D Visualization').replace(/_/g, ' '),
          description:
            project.description ||
            `${project.name} — ${(project.category || '3D Visualization').replace(/_/g, ' ')} project by Rami Hendi.`,
          image: project.coverUrl || undefined,
          url: `${baseUrl}?project=${encodeURIComponent(project.id)}`,
          creator: {
            '@type': 'Person',
            name: 'Rami Hendi',
          },
        },
      })),
    });
  }

  upsertJsonLd('dynamic-seo-jsonld', {
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}
