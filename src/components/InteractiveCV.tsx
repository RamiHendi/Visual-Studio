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
        // NORMAL paragraph
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

  return (
    <section className="space-y-8">
      {/* CV Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-charcoal/80 p-5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <i className="fa-solid fa-file-word text-xl"></i>
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">Live Curriculum Vitae</h2>
            <p className="text-xs text-gray-400">
              Automatically structured from <span className="text-gray-200 font-mono">Rami_Hendi_CV</span> Google Doc
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-panel hover:bg-white/10 text-gray-200 border border-white/10 text-xs sm:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer"
          >
            <i className="fa-solid fa-print"></i>
            <span>Print View</span>
          </button>
          <a
            href={isDemoPdf ? '#cv-pdf' : cvPdfUrl}
            target={isDemoPdf ? '_self' : '_blank'}
            rel="noopener noreferrer"
            onClick={handleExportPdf}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf"></i>
            <span>Export Live Google Doc PDF</span>
          </a>
        </div>
      </div>

      {/* Dynamic CV Cards Container */}
      {sections.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-charcoal/40 rounded-2xl border border-white/10">
          No CV content found in Google Doc.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {sections.map((sec, secIdx) => {
            const isSkillsSection = /skill|software|tool|tech/i.test(sec.title);
            const colSpanClass = isSkillsSection ? 'lg:col-span-5' : 'lg:col-span-7';

            return (
              <div
                key={secIdx}
                className={`col-span-12 ${
                  sections.length <= 2 ? 'lg:col-span-12' : colSpanClass
                } bg-charcoal/85 border border-white/10 rounded-2xl p-6 sm:p-7 space-y-5 flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  {/* Section Header */}
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">
                      {sec.title}
                    </h3>
                  </div>

                  {/* Direct Section Paragraphs */}
                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="text-sm sm:text-base text-gray-300 leading-relaxed">
                      {p}
                    </p>
                  ))}

                  {/* Direct Section Bullets (Rendered as Skill Tags if Skills section) */}
                  {sec.bullets.length > 0 && (
                    isSkillsSection ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {sec.bullets.map((b, bIdx) => (
                          <span
                            key={bIdx}
                            className="px-3.5 py-2 rounded-xl bg-obsidian border border-white/10 hover:border-amber-500/40 text-xs sm:text-sm font-mono text-gray-200 flex items-center gap-2 transition-colors"
                          >
                            <i className="fa-solid fa-check text-amber-400 text-[10px]"></i>
                            <span>{b}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2.5 pt-1">
                        {sec.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="text-sm text-gray-300 flex items-start gap-2.5">
                            <span className="text-amber-400 mt-1.5 text-[8px]">
                              <i className="fa-solid fa-circle"></i>
                            </span>
                            <span className="leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}

                  {/* Sub-Roles / Timeline Items */}
                  {sec.roles.length > 0 && (
                    <div className="space-y-6 pt-2">
                      {sec.roles.map((role, rIdx) => {
                        const parsed = parseRoleHeader(role.header);
                        return (
                          <div
                            key={rIdx}
                            className="relative pl-5 border-l-2 border-amber-500/40 space-y-2"
                          >
                            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-obsidian border-2 border-amber-400"></div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <h4 className="font-display font-bold text-base text-white">
                                {parsed.roleTitle}
                              </h4>
                              {parsed.dateOrMeta && (
                                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-amber-300 shrink-0 self-start sm:self-auto">
                                  {parsed.dateOrMeta}
                                </span>
                              )}
                            </div>
                            {parsed.company && (
                              <div className="text-xs sm:text-sm font-medium text-cyan-400">
                                {parsed.company}
                              </div>
                            )}
                            {role.paragraphs.map((rp, rpIdx) => (
                              <p key={rpIdx} className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                {rp}
                              </p>
                            ))}
                            {role.bullets.length > 0 && (
                              <ul className="space-y-1.5 pt-1">
                                {role.bullets.map((rb, rbIdx) => (
                                  <li key={rbIdx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                                    <span className="text-amber-400 mt-1">▹</span>
                                    <span className="leading-relaxed">{rb}</span>
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
