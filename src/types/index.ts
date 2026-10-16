export interface CVElement {
  kind: 'paragraph' | 'bullet';
  heading: string;
  text: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  thumbUrl: string;
  fullUrl?: string;
  embedUrl?: string;
  category?: string;
}

export interface PortfolioCategory {
  rawOrder: string;
  category: string;
  items: PortfolioItem[];
}

export interface StudioData {
  studioName: string;
  updatedAt: string;
  cvPdfUrl: string;
  cv: CVElement[];
  portfolio: PortfolioCategory[];
}

export type MainTab = 'portfolio' | 'cv' | 'cms';
export type GalleryLayout = 'masonry' | 'grid';

export interface CVRole {
  header: string;
  paragraphs: string[];
  bullets: string[];
}

export interface CVSection {
  title: string;
  paragraphs: string[];
  roles: CVRole[];
  bullets: string[];
}

export interface ToastState {
  show: boolean;
  message: string;
  isWarning?: boolean;
}
