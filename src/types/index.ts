export interface CVElement {
  kind: 'paragraph' | 'bullet';
  heading: string;
  text: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  type: 'image' | 'video';
  thumbUrl: string;
  fullUrl?: string;
  embedUrl?: string;
  category?: string;
  featured?: boolean;
  projectId?: string;
  projectName?: string;
}

export interface PortfolioProject {
  id: string;
  name: string;
  rawOrder?: string;
  category: string;
  description?: string;
  featured?: boolean;
  coverUrl: string;
  items: PortfolioItem[];
  isProjectGroup?: boolean;
}

export interface PortfolioCategory {
  rawOrder: string;
  category: string;
  items?: PortfolioItem[];
  projects?: PortfolioProject[];
}

export interface StudioData {
  studioName: string;
  updatedAt: string;
  version?: string;
  cvPdfUrl: string;
  visitorCount?: number;
  cv: CVElement[];
  portfolio: PortfolioCategory[];
}

export type MainTab = 'portfolio' | 'cv';

export interface NavigationMetadata {
  section: string;
  category?: string;
  subCategory?: string;
}

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
