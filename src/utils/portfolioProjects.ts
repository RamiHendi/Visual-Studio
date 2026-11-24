import { PortfolioCategory, PortfolioItem, PortfolioProject } from '../types';

/**
 * Clean a Google Drive project subfolder name for display:
 * - Removes optional numeric sort prefixes (e.g. "01_", "02 - ")
 * - Strips [featured] / #featured markers (used for featured detection)
 * - Replaces underscores with spaces
 */
export function cleanProjectDisplayName(rawName: string): string {
  return (rawName || '')
    .replace(/^\d+[\s._-]+/, '')
    .replace(/\[featured\]/gi, '')
    .replace(/#featured/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isItemFeatured(item: PortfolioItem): boolean {
  if (item.featured === true) return true;
  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  return (
    title.includes('[featured]') ||
    desc.includes('#featured') ||
    desc.includes('featured: true')
  );
}

export function isProjectFeatured(project: {
  name?: string;
  rawOrder?: string;
  description?: string;
  featured?: boolean;
  items?: PortfolioItem[];
}): boolean {
  if (project.featured === true) return true;
  const raw = `${project.rawOrder || ''} ${project.name || ''}`.toLowerCase();
  const desc = (project.description || '').toLowerCase();
  if (
    raw.includes('[featured]') ||
    raw.includes('#featured') ||
    desc.includes('#featured') ||
    desc.includes('featured: true')
  ) {
    return true;
  }
  return (project.items || []).some((item) => isItemFeatured(item));
}

function resolveCoverUrl(items: PortfolioItem[], explicitCover?: string): string {
  if (explicitCover && explicitCover.trim()) return explicitCover.trim();
  const firstImage = items.find((i) => i.type !== 'video' && i.thumbUrl?.trim());
  if (firstImage) return firstImage.thumbUrl.trim();
  const firstWithThumb = items.find((i) => i.thumbUrl?.trim());
  return firstWithThumb?.thumbUrl?.trim() || '';
}

/**
 * Normalize a PortfolioCategory into an array of PortfolioProject entries.
 * Supports:
 * 1. Explicit `cat.projects` returned by the subfolder-aware Google Apps Script
 * 2. Loose `cat.items` carrying `projectName` (grouped automatically)
 * 3. Standalone loose `cat.items` directly inside a category folder (backward-compatible)
 */
export function getCategoryProjects(cat: PortfolioCategory): PortfolioProject[] {
  const results: PortfolioProject[] = [];
  const categoryName = cat.category;

  // 1. Explicit project subfolders from Google Drive
  if (Array.isArray(cat.projects) && cat.projects.length > 0) {
    cat.projects.forEach((proj, idx) => {
      const rawItems = Array.isArray(proj.items) ? proj.items : [];
      if (rawItems.length === 0) return;

      const cleanName =
        cleanProjectDisplayName(proj.name || proj.rawOrder || '') ||
        categoryName.replace(/_/g, ' ');
      const projId = proj.id || `${categoryName}::project::${idx}`;
      const featured = isProjectFeatured({ ...proj, items: rawItems });

      const enrichedItems: PortfolioItem[] = rawItems.map((item) => ({
        ...item,
        category: categoryName,
        projectId: projId,
        projectName: cleanName,
        featured: isItemFeatured(item) || featured,
      }));

      results.push({
        id: projId,
        name: cleanName,
        rawOrder: proj.rawOrder,
        category: categoryName,
        description: (proj.description || '')
          .replace(/#featured/gi, '')
          .replace(/featured:\s*true/gi, '')
          .trim(),
        featured,
        coverUrl: resolveCoverUrl(enrichedItems, proj.coverUrl),
        items: enrichedItems,
        isProjectGroup: true,
      });
    });
  }

  // 2. Loose items directly inside the category folder (or grouped by projectName if set)
  const looseItems = Array.isArray(cat.items) ? cat.items : [];
  if (looseItems.length > 0) {
    const groupedByName = new Map<string, PortfolioItem[]>();
    const standaloneItems: PortfolioItem[] = [];

    looseItems.forEach((item) => {
      if (item.projectName && item.projectName.trim()) {
        const key = item.projectName.trim();
        const existing = groupedByName.get(key) || [];
        existing.push(item);
        groupedByName.set(key, existing);
      } else {
        standaloneItems.push(item);
      }
    });

    groupedByName.forEach((groupItems, rawGroupName) => {
      const cleanName = cleanProjectDisplayName(rawGroupName) || rawGroupName;
      const projId =
        groupItems[0]?.projectId ||
        `${categoryName}::group::${cleanName.toLowerCase().replace(/\s+/g, '-')}`;
      const featured = groupItems.some((item) => isItemFeatured(item));
      const enrichedItems = groupItems.map((item) => ({
        ...item,
        category: categoryName,
        projectId: projId,
        projectName: cleanName,
        featured: isItemFeatured(item),
      }));

      results.push({
        id: projId,
        name: cleanName,
        category: categoryName,
        description: enrichedItems[0]?.description || '',
        featured,
        coverUrl: resolveCoverUrl(enrichedItems),
        items: enrichedItems,
        isProjectGroup: true,
      });
    });

    // Backward-compatible standalone loose items (do NOT expose file names)
    standaloneItems.forEach((item, idx) => {
      const itemFeatured = isItemFeatured(item);
      const enriched: PortfolioItem = {
        ...item,
        category: categoryName,
        featured: itemFeatured,
      };
      results.push({
        id: item.id || `${categoryName}::item::${idx}`,
        name: '',
        category: categoryName,
        description: item.description || '',
        featured: itemFeatured,
        coverUrl: item.thumbUrl || '',
        items: [enriched],
        isProjectGroup: false,
      });
    });
  }

  return results;
}

export function getAllPortfolioProjects(
  categories: PortfolioCategory[]
): PortfolioProject[] {
  const all: PortfolioProject[] = [];
  (categories || []).forEach((cat) => {
    all.push(...getCategoryProjects(cat));
  });
  return all;
}

export function countCategoryWorks(cat: PortfolioCategory): number {
  return getCategoryProjects(cat).reduce(
    (sum, proj) => sum + proj.items.length,
    0
  );
}
