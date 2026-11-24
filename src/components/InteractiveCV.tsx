import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CVElement, CVSection, CVRole, NavigationMetadata } from '../types';

interface InteractiveCVProps {
  elements: CVElement[];
  cvPdfUrl: string;
  onNavigationChange?: (meta: NavigationMetadata) => void;
}

const KNOWN_SECTION_HEADINGS = new Set([
  'profile',
  'summary',
  'professional summary',
  'executive summary',
  'executive summary & studio profile',
  'about',
  'about me',
  'objective',
  'core skills',
  'skills',
  'technical skills',
  'software & tools',
  'software & technical skills',
  'core competencies',
  'competencies',
  'expertise',
  'areas of expertise',
  'experience',
  'work experience',
  'work experience & studio leadership',
  'professional experience',
  'earlier experience',
  'additional experience',
  'prior experience',
  'employment history',
  'career history',
  'education',
  'education & certifications',
  'education & technical certifications',
  'certifications',
  'certificates',
  'courses',
  'training',
  'awards',
  'honors',
  'projects',
  'selected projects',
  'key projects',
  'publications',
  'languages',
  'interests',
  'references',
  'contact',
]);

const BULLET_PREFIX_RE = /^\s*[•●▪▸◦‣∙\-–—*]\s+/;

const DATE_RANGE_RE =
  /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b(?:19|20)\d{2}\b)\s*(?:[-–—]|to)\s*(?:Present|Current|Now|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b(?:19|20)\d{2}\b)/i;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isPlainTextBullet(text: string): boolean {
  return BULLET_PREFIX_RE.test(text);
}

function stripBulletPrefix(text: string): string {
  return normalizeWhitespace(text.replace(BULLET_PREFIX_RE, ''));
}

function isKnownSectionTitle(text: string): boolean {
  const clean = normalizeWhitespace(text).replace(/:$/, '').toLowerCase();
  if (!clean || clean.length > 60) return false;
  return KNOWN_SECTION_HEADINGS.has(clean);
}

function isRoleHeaderLine(text: string, sectionTitle: string): boolean {
  if (isPlainTextBullet(text)) return false;
  if (/earlier|prior|additional/i.test(sectionTitle)) return false;
  if (!/experience|employment|career|work/i.test(sectionTitle)) return false;

  if (text.includes('\t') && DATE_RANGE_RE.test(text)) return true;
  if (text.includes('|') && DATE_RANGE_RE.test(text)) return true;
  if (/[—–]/.test(text) && DATE_RANGE_RE.test(text) && text.length < 140) return true;
  return false;
}

function parseRoleHeader(raw: string): {
  roleTitle: string;
  company: string;
  dateOrMeta: string;
} {
  let working = raw.trim();
  let roleTitle = working;
  let company = '';
  let dateOrMeta = '';

  if (working.includes('\t')) {
    const tabParts = working
      .split('\t')
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean);
    if (tabParts.length >= 2) {
      dateOrMeta = tabParts.pop() || '';
      working = tabParts.join(' | ');
    } else {
      working = tabParts[0] || working;
    }
  }

  if (working.includes('|')) {
    const parts = working
      .split('|')
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean);

    if (!dateOrMeta && parts.length >= 2 && DATE_RANGE_RE.test(parts[parts.length - 1])) {
      dateOrMeta = parts.pop() || '';
    }

    if (parts.length >= 2) {
      roleTitle = parts[0];
      company = parts.slice(1).join(' · ');
      return { roleTitle, company, dateOrMeta };
    }
    working = parts[0] || working;
  }

  if (working.includes('—')) {
    const parts = working.split('—').map((part) => normalizeWhitespace(part));
    roleTitle = parts[0];
    company = parts.slice(1).join(' — ');
  } else if (working.includes(' - ')) {
    const parts = working.split(' - ').map((part) => normalizeWhitespace(part));
    roleTitle = parts[0];
    company = parts.slice(1).join(' - ');
  } else {
    roleTitle = normalizeWhitespace(working);
  }

  return { roleTitle, company, dateOrMeta };
}

function parseCompactTimelineLine(text: string): {
  main: string;
  period: string;
} | null {
  const clean = normalizeWhitespace(text);
  const match = clean.match(
    /^(.*?)\s*\(((?:19|20)\d{2}(?:\s*[-–—]\s*(?:(?:19|20)\d{2}|Present))?)\)\s*$/i
  );
  if (!match) return null;
  return {
    main: match[1].trim(),
    period: match[2].trim(),
  };
}

function splitSkillLabel(text: string): { label: string; detail: string } | null {
  const colonIndex = text.indexOf(':');
  if (colonIndex <= 0 || colonIndex > 45) return null;
  const label = text.slice(0, colonIndex).trim();
  const detail = text.slice(colonIndex + 1).trim();
  if (!label || !detail) return null;
  return { label, detail };
}

function formatPrintDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const InteractiveCV: React.FC<InteractiveCVProps> = ({
  elements,
  cvPdfUrl,
  onNavigationChange,
}) => {
  const [activeSectionTitle, setActiveSectionTitle] = useState<string>('');
  const [activeRole, setActiveRole] = useState<{ section: string; role: string } | null>(
    null
  );
  const [printDate, setPrintDate] = useState<string>(() => formatPrintDate(new Date()));
  const sectionNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const roleNodesRef = useRef<Map<string, { section: string; role: string; node: HTMLDivElement }>>(
    new Map()
  );

  useEffect(() => {
    const handleBeforePrint = () => {
      setPrintDate(formatPrintDate(new Date()));
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, []);

  const { sections, headerSubtitle, contactTokens } = useMemo(() => {
    if (!elements || elements.length === 0) {
      return {
        sections: [] as CVSection[],
        headerSubtitle: '',
        contactTokens: [] as string[],
      };
    }

    const hasExplicitHeadings = elements.some(
      (el) => el.heading === 'HEADING1' || el.heading === 'HEADING2'
    );

    let extractedSubtitle = '';
    let extractedContacts: string[] = [];
    let startIndex = 0;

    const explicitSubtitleEl = elements.find((el) => el.heading === 'SUBTITLE');
    if (explicitSubtitleEl?.text?.trim()) {
      extractedSubtitle = normalizeWhitespace(explicitSubtitleEl.text);
    }

    if (!hasExplicitHeadings) {
      let i = 0;
      while (i < elements.length && i < 4) {
        const rawText = elements[i].text?.trim() || '';
        const cleanText = normalizeWhitespace(rawText);
        if (!cleanText) {
          i++;
          continue;
        }
        if (isKnownSectionTitle(cleanText)) {
          break;
        }
        if (i === 0 && cleanText.length <= 40 && !cleanText.includes('@') && !cleanText.includes('|')) {
          i++;
          continue;
        }
        if (cleanText.includes('@') || /\+?\d[\d\s\-()]{7,}/.test(cleanText)) {
          extractedContacts = cleanText
            .split('|')
            .map((token) => normalizeWhitespace(token))
            .filter(Boolean);
          i++;
          continue;
        }
        if (!extractedSubtitle && cleanText.length <= 100 && !isPlainTextBullet(rawText)) {
          extractedSubtitle = cleanText;
          i++;
          continue;
        }
        break;
      }
      startIndex = i;
    }

    const result: CVSection[] = [];
    let currentSection: CVSection | null = null;
    let currentRole: CVRole | null = null;

    const ensureSection = (fallbackTitle = 'Overview'): CVSection => {
      if (!currentSection) {
        currentSection = {
          title: fallbackTitle,
          paragraphs: [],
          roles: [],
          bullets: [],
        };
        result.push(currentSection);
      }
      return currentSection;
    };

    for (let idx = startIndex; idx < elements.length; idx++) {
      const el = elements[idx];
      if (!el?.text || !el.text.trim()) continue;
      if (el.heading === 'TITLE' || el.heading === 'SUBTITLE') continue;

      const rawText = el.text;
      const cleanText = normalizeWhitespace(rawText);
      const isHeading1 =
        el.heading === 'HEADING1' ||
        (!hasExplicitHeadings && isKnownSectionTitle(cleanText));

      if (isHeading1) {
        currentSection = {
          title: cleanText.replace(/:$/, ''),
          paragraphs: [],
          roles: [],
          bullets: [],
        };
        result.push(currentSection);
        currentRole = null;
        continue;
      }

      const isHeading2 =
        el.heading === 'HEADING2' ||
        (currentSection !== null && isRoleHeaderLine(rawText, currentSection.title));

      if (isHeading2) {
        const targetSection = ensureSection('Experience');
        currentRole = {
          header: rawText.trim(),
          paragraphs: [],
          bullets: [],
        };
        targetSection.roles.push(currentRole);
        continue;
      }

      const isBullet =
        el.kind === 'bullet' ||
        el.heading === 'LIST_ITEM' ||
        isPlainTextBullet(rawText);

      if (isBullet) {
        const bulletText = stripBulletPrefix(rawText);
        if (!bulletText) continue;
        if (currentRole) {
          currentRole.bullets.push(bulletText);
        } else {
          ensureSection().bullets.push(bulletText);
        }
        continue;
      }

      if (currentRole) {
        currentRole.paragraphs.push(cleanText);
      } else {
        ensureSection().paragraphs.push(cleanText);
      }
    }

    return {
      sections: result,
      headerSubtitle: extractedSubtitle,
      contactTokens: extractedContacts,
    };
  }, [elements]);

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSectionTitle('');
      setActiveRole(null);
      return;
    }
    setActiveSectionTitle((prev) =>
      prev && sections.some((s) => s.title === prev) ? prev : sections[0].title
    );
  }, [sections]);

  useEffect(() => {
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const title = visible[0].target.getAttribute('data-cv-section') || '';
          if (title) {
            setActiveSectionTitle(title);
            const matchedSec = sections.find((s) => s.title === title);
            if (!matchedSec || matchedSec.roles.length === 0) {
              setActiveRole(null);
            }
          }
        }
      },
      {
        rootMargin: '-110px 0px -65% 0px',
        threshold: 0,
      }
    );

    sectionNodesRef.current.forEach((node) => sectionObserver.observe(node));

    const roleObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const secTitle = visible[0].target.getAttribute('data-cv-role-section') || '';
          const roleTitle = visible[0].target.getAttribute('data-cv-role-title') || '';
          if (secTitle) setActiveSectionTitle(secTitle);
          if (secTitle && roleTitle) {
            setActiveRole({ section: secTitle, role: roleTitle });
          }
        }
      },
      {
        rootMargin: '-120px 0px -70% 0px',
        threshold: 0,
      }
    );

    roleNodesRef.current.forEach((entry) => roleObserver.observe(entry.node));

    return () => {
      sectionObserver.disconnect();
      roleObserver.disconnect();
    };
  }, [sections]);

  useEffect(() => {
    const resolvedSection = activeSectionTitle || sections[0]?.title || undefined;
    const matchedSection = sections.find((s) => s.title === resolvedSection);
    const resolvedRole =
      matchedSection &&
      matchedSection.roles.length > 0 &&
      activeRole &&
      activeRole.section === resolvedSection
        ? activeRole.role
        : undefined;

    onNavigationChange?.({
      section: 'Curriculum Vitae',
      category: resolvedSection,
      subCategory: resolvedRole,
    });
  }, [activeSectionTitle, activeRole, sections, onNavigationChange]);

  const isDemoPdf =
    !cvPdfUrl ||
    cvPdfUrl.includes('DEMO_DOC_ID') ||
    cvPdfUrl.includes('PASTE_YOUR_');

  const handleExportPdf = (e: React.MouseEvent) => {
    if (isDemoPdf) {
      e.preventDefault();
      window.print();
    }
  };

  const formatSectionNumber = (index: number) => `${String(index + 1).padStart(2, '0')}.`;

  const eyebrowText = headerSubtitle
    ? `Rami Hendi · ${headerSubtitle}`
    : 'Rami Hendi · 3D Artist (Generalist) · 10+ Years of Experience';

  return (
    <section aria-labelledby="cv-page-heading" className="cv-print-root space-y-12 pt-2 sm:pt-6">
      <div className="cv-print-header flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-2.5">
          <p className="cv-print-muted text-xs font-mono text-zinc-400 tracking-wide">
            {eyebrowText}
          </p>
          <h1
            id="cv-page-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-zinc-100 leading-tight [text-wrap:balance]"
          >
            Curriculum Vitae
          </h1>
          {contactTokens.length > 0 ? (
            <div className="cv-print-muted flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-zinc-400 pt-0.5">
              {contactTokens
                .filter((token) => !/^(linkedin|facebook)\b/i.test(token))
                .map((token, idx, arr) => {
                  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token);
                  const isPhone = /^\+?[\d\s\-()]{8,}$/.test(token);
                  return (
                    <React.Fragment key={idx}>
                      {isEmail ? (
                        <a
                          href={`mailto:${token}`}
                          className="text-zinc-300 hover:text-brass transition-colors"
                        >
                          {token}
                        </a>
                      ) : isPhone ? (
                        <a
                          href={`tel:${token.replace(/[^\d+]/g, '')}`}
                          className="font-mono text-xs text-zinc-300 hover:text-brass transition-colors tabular-nums"
                        >
                          {token}
                        </a>
                      ) : (
                        <span>{token}</span>
                      )}
                      {idx < arr.length - 1 && (
                        <span aria-hidden="true" className="text-zinc-600">
                          ·
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
            </div>
          ) : (
            <p className="cv-print-muted text-sm text-zinc-400">
              Professional Experience, Technical Skills &amp; Education
            </p>
          )}
        </div>

        <div className="print-hidden flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-sm bg-transparent hover:bg-charcoal text-zinc-200 border border-white/15 hover:border-white/30 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <i aria-hidden="true" className="fa-solid fa-print text-xs text-zinc-400"></i>
            <span>Print View</span>
          </button>

          <a
            href={isDemoPdf ? '#cv-pdf' : cvPdfUrl}
            target={isDemoPdf ? '_self' : '_blank'}
            rel="noopener noreferrer"
            download={!isDemoPdf}
            onClick={handleExportPdf}
            className="px-5 py-2.5 rounded-sm bg-brass hover:bg-brassHover text-obsidian font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <i aria-hidden="true" className="fa-solid fa-file-arrow-down text-xs"></i>
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-400 border border-white/[0.08] bg-charcoal/40 rounded-sm">
          No CV content available at this time.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.08]">
          {sections.map((sec, secIdx) => {
            const isSkillsSection = /skill|software|tool|tech|competenc/i.test(sec.title);
            const hasCompactTimeline =
              sec.paragraphs.length > 0 &&
              sec.paragraphs.every((p) => parseCompactTimelineLine(p) !== null);

            return (
              <div
                key={secIdx}
                data-cv-section={sec.title}
                ref={(node) => {
                  if (node) {
                    sectionNodesRef.current.set(sec.title, node);
                  } else {
                    sectionNodesRef.current.delete(sec.title);
                  }
                }}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 ${
                  secIdx === 0 ? 'pb-10 sm:pb-12' : 'py-10 sm:py-12'
                }`}
              >
                <div className="lg:col-span-4 space-y-1.5">
                  <div className="font-mono text-xs text-brass tabular-nums">
                    {formatSectionNumber(secIdx)}
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-zinc-100">
                    {sec.title}
                  </h2>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  {sec.paragraphs.length > 0 &&
                    (hasCompactTimeline ? (
                      <div className="divide-y divide-white/[0.07]">
                        {sec.paragraphs.map((p, pIdx) => {
                          const parsedLine = parseCompactTimelineLine(p);
                          if (!parsedLine) return null;
                          return (
                            <div
                              key={pIdx}
                              className={`${
                                pIdx === 0 ? 'pb-3.5' : 'py-3.5'
                              } flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4`}
                            >
                              <span className="text-sm sm:text-base text-zinc-200 leading-snug">
                                {parsedLine.main}
                              </span>
                              <span className="font-mono text-xs text-zinc-400 tabular-nums shrink-0">
                                {parsedLine.period}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sec.paragraphs.map((p, pIdx) => (
                          <p
                            key={pIdx}
                            className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl text-justify"
                          >
                            {p}
                          </p>
                        ))}
                      </div>
                    ))}

                  {sec.bullets.length > 0 &&
                    (isSkillsSection ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
                        {sec.bullets.map((b, bIdx) => {
                          const labeled = splitSkillLabel(b);
                          return (
                            <div
                              key={bIdx}
                              className="py-3.5 border-b border-white/[0.07] text-sm leading-relaxed"
                            >
                              {labeled ? (
                                <div className="space-y-1">
                                  <div className="font-display font-medium text-zinc-100">
                                    {labeled.label}
                                  </div>
                                  <div className="text-zinc-400 text-xs sm:text-sm leading-relaxed text-justify">
                                    {labeled.detail}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-zinc-200 block text-justify">{b}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {sec.bullets.map((b, bIdx) => (
                          <li
                            key={bIdx}
                            className="text-sm text-zinc-300 leading-relaxed flex items-start gap-3"
                          >
                            <span
                              aria-hidden="true"
                              className="text-brass font-mono text-xs mt-0.5 shrink-0"
                            >
                              —
                            </span>
                            <span className="text-justify">{b}</span>
                          </li>
                        ))}
                      </ul>
                    ))}

                  {sec.roles.length > 0 && (
                    <div className="divide-y divide-white/[0.07]">
                      {sec.roles.map((role, rIdx) => {
                        const parsed = parseRoleHeader(role.header);
                        return (
                          <div
                            key={rIdx}
                            data-cv-role-section={sec.title}
                            data-cv-role-title={parsed.roleTitle}
                            ref={(node) => {
                              const roleKey = `${sec.title}::${rIdx}`;
                              if (node) {
                                roleNodesRef.current.set(roleKey, {
                                  section: sec.title,
                                  role: parsed.roleTitle,
                                  node,
                                });
                              } else {
                                roleNodesRef.current.delete(roleKey);
                              }
                            }}
                            className={`${rIdx === 0 ? 'pb-7' : 'py-7'} space-y-3`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                              <div>
                                <h3 className="font-display text-lg font-medium text-zinc-100">
                                  {parsed.roleTitle}
                                </h3>
                                {parsed.company && (
                                  <div className="text-sm text-brass/90 mt-0.5">
                                    {parsed.company}
                                  </div>
                                )}
                              </div>

                              {parsed.dateOrMeta && (
                                <span className="font-mono text-xs text-zinc-400 tabular-nums shrink-0">
                                  {parsed.dateOrMeta}
                                </span>
                              )}
                            </div>

                            {role.paragraphs.map((rp, rpIdx) => (
                              <p
                                key={rpIdx}
                                className="text-sm text-zinc-300 leading-relaxed max-w-2xl text-justify"
                              >
                                {rp}
                              </p>
                            ))}

                            {role.bullets.length > 0 && (
                              <ul className="space-y-2 pt-1">
                                {role.bullets.map((rb, rbIdx) => (
                                  <li
                                    key={rbIdx}
                                    className="text-sm text-zinc-300 leading-relaxed flex items-start gap-3"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="text-zinc-500 font-mono text-xs mt-0.5 shrink-0"
                                    >
                                      —
                                    </span>
                                    <span className="text-justify">{rb}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hidden cv-print-footer font-mono text-[11px] tracking-wide">
        Generated on {printDate}
      </div>
    </section>
  );
};
