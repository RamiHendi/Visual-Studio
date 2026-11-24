import React, { useMemo } from 'react';
import { CVElement, CVSection, CVRole } from '../types';

interface InteractiveCVProps {
  elements: CVElement[];
  cvPdfUrl: string;
}

function parseRoleHeader(raw: string): { roleTitle: string; company: string; dateOrMeta: string } {
  let roleTitle = raw;
  let company = '';
  let dateOrMeta = '';

  if (raw.includes('|')) {
    const parts = raw.split('|');
    dateOrMeta = parts.pop()?.trim() || '';
    raw = parts.join('|').trim();
  }
  if (raw.includes('—')) {
    const parts = raw.split('—');
    roleTitle = parts[0].trim();
    company = parts.slice(1).join('—').trim();
  } else if (raw.includes(' - ')) {
    const parts = raw.split(' - ');
    roleTitle = parts[0].trim();
    company = parts.slice(1).join(' - ').trim();
  } else {
    roleTitle = raw;
  }

  return { roleTitle, company, dateOrMeta };
}

export const InteractiveCV: React.FC<InteractiveCVProps> = ({ elements, cvPdfUrl }) => {
  const sections: CVSection[] = useMemo(() => {
    if (!elements || elements.length === 0) return [];

    const result: CVSection[] = [];
    let currentSection: CVSection | null = null;
    let currentRole: CVRole | null = null;

    elements.forEach((el) => {
      if (el.heading === 'TITLE' || el.heading === 'SUBTITLE') return;

      if (el.heading === 'HEADING1') {
        currentSection = {
          title: el.text,
          paragraphs: [],
          roles: [],
          bullets: [],
        };
        result.push(currentSection);
        currentRole = null;
      } else if (el.heading === 'HEADING2') {
        if (!currentSection) {
          currentSection = { title: 'Overview', paragraphs: [], roles: [], bullets: [] };
          result.push(currentSection);
        }
        currentRole = {
          header: el.text,
          paragraphs: [],
          bullets: [],
        };
        currentSection.roles.push(currentRole);
      } else if (el.kind === 'bullet' || el.heading === 'LIST_ITEM') {
        if (currentRole) {
          currentRole.bullets.push(el.text);
        } else if (currentSection) {
          currentSection.bullets.push(el.text);
        }
      } else {
        if (currentRole) {
          currentRole.paragraphs.push(el.text);
        } else if (currentSection) {
          currentSection.paragraphs.push(el.text);
        }
      }
    });

    return result;
  }, [elements]);

  const isDemoPdf = !cvPdfUrl || cvPdfUrl.includes('DEMO_DOC_ID');

  const handleExportPdf = (e: React.MouseEvent) => {
    if (isDemoPdf) {
      e.preventDefault();
      window.print();
    }
  };

  const formatSectionNumber = (index: number) => `${String(index + 1).padStart(2, '0')}.`;

  return (
    <section className="space-y-12 pt-2 sm:pt-6">
      {/* Editorial Monograph CV Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-2.5">
          <p className="text-xs font-mono text-zinc-400 tracking-wide">
            Rami Hendi · 3D Artist (Generalist) · 10+ Years of Experience
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-zinc-100 leading-tight [text-wrap:balance]">
            Curriculum Vitae
          </h1>
          <p className="text-sm text-zinc-400">
            Professional Experience, Technical Skills &amp; Education
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-sm bg-transparent hover:bg-charcoal text-zinc-200 border border-white/15 hover:border-white/30 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-print text-xs text-zinc-400"></i>
            <span>Print View</span>
          </button>

          <a
            href={isDemoPdf ? '#cv-pdf' : cvPdfUrl}
            target={isDemoPdf ? '_self' : '_blank'}
            rel="noopener noreferrer"
            onClick={handleExportPdf}
            className="px-5 py-2.5 rounded-sm bg-brass hover:bg-brassHover text-obsidian font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-file-arrow-down text-xs"></i>
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Structured Editorial Monograph Sections */}
      {sections.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-400 border border-white/[0.08] bg-charcoal/40 rounded-sm">
          No CV content available at this time.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.08]">
          {sections.map((sec, secIdx) => {
            const isSkillsSection = /skill|software|tool|tech/i.test(sec.title);

            return (
              <div
                key={secIdx}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 ${
                  secIdx === 0 ? 'pb-10 sm:pb-12' : 'py-10 sm:py-12'
                }`}
              >
                {/* Left Index Column */}
                <div className="lg:col-span-4 space-y-1.5">
                  <div className="font-mono text-xs text-brass tabular-nums">
                    {formatSectionNumber(secIdx)}
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-zinc-100">
                    {sec.title}
                  </h2>
                </div>

                {/* Right Monograph Content Column */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Direct Section Paragraphs */}
                  {sec.paragraphs.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl"
                    >
                      {p}
                    </p>
                  ))}

                  {/* Direct Section Bullets */}
                  {sec.bullets.length > 0 &&
                    (isSkillsSection ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
                        {sec.bullets.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            className="py-3 border-b border-white/[0.07] text-sm text-zinc-200 leading-snug"
                          >
                            {b}
                          </div>
                        ))}
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
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ))}

                  {/* Sub-Roles / Experience Entries */}
                  {sec.roles.length > 0 && (
                    <div className="divide-y divide-white/[0.07]">
                      {sec.roles.map((role, rIdx) => {
                        const parsed = parseRoleHeader(role.header);
                        return (
                          <div
                            key={rIdx}
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
                                className="text-sm text-zinc-300 leading-relaxed max-w-2xl"
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
                                    <span>{rb}</span>
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
    </section>
  );
};
