import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Mail,
  X,
} from 'lucide-react';
import {
  BehanceIcon,
  FacebookIcon,
  LinkedInIcon,
  WhatsAppIcon,
} from './BrandIcons';
import {
  decodeDirectEmail,
  decodeDirectEmailHref,
  decodeDirectWhatsAppDisplay,
  decodeDirectWhatsAppHref,
} from '../utils/contactPrivacy';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string, isWarning?: boolean) => void;
}

type SocialChannelId = 'linkedin' | 'facebook' | 'behance';

interface SocialChannel {
  id: SocialChannelId;
  name: string;
  handle: string;
  description: string;
  href: string;
}

interface ProtectedChannel {
  id: 'email' | 'whatsapp';
  name: string;
  maskedPrompt: string;
  description: string;
  external: boolean;
  openLabel: string;
}

interface RevealedDetail {
  display: string;
  href: string;
}

const PROTECTED_CHANNELS: ProtectedChannel[] = [
  {
    id: 'email',
    name: 'Email',
    maskedPrompt: 'Click to reveal email address',
    description: 'Project inquiries & direct correspondence',
    external: false,
    openLabel: 'Compose',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    maskedPrompt: 'Click to reveal WhatsApp number',
    description: 'Direct chat & quick project discussions',
    external: true,
    openLabel: 'Open Chat',
  },
];

const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    handle: 'linkedin.com/in/ramihendi',
    description: 'Professional experience & network',
    href: 'https://www.linkedin.com/in/ramihendi/',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'facebook.com/ramihendi.artworks',
    description: 'Artworks & studio updates',
    href: 'https://www.facebook.com/ramihendi.artworks',
  },
  {
    id: 'behance',
    name: 'Behance',
    handle: 'behance.net/ramihendi',
    description: 'Visual case studies & selected works',
    href: 'https://www.behance.net/ramihendi',
  },
];

function renderProtectedChannelIcon(id: 'email' | 'whatsapp'): React.ReactElement {
  if (id === 'whatsapp') {
    return <WhatsAppIcon className="w-4 h-4" />;
  }
  return <Mail aria-hidden="true" className="w-4 h-4" />;
}

function renderSocialChannelIcon(id: SocialChannelId): React.ReactElement {
  switch (id) {
    case 'linkedin':
      return <LinkedInIcon className="w-4 h-4" />;
    case 'facebook':
      return <FacebookIcon className="w-4 h-4" />;
    case 'behance':
      return <BehanceIcon className="w-4 h-4" />;
  }
}

async function copyContactValue(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    void 0;
  }

  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [revealed, setRevealed] = useState<Partial<Record<'email' | 'whatsapp', RevealedDetail>>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setRevealed({});
      setCopiedId(null);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleRevealChannel = (id: 'email' | 'whatsapp') => {
    setRevealed((prev) => {
      if (prev[id]) return prev;
      const detail: RevealedDetail =
        id === 'email'
          ? { display: decodeDirectEmail(), href: decodeDirectEmailHref() }
          : { display: decodeDirectWhatsAppDisplay(), href: decodeDirectWhatsAppHref() };
      return { ...prev, [id]: detail };
    });
  };

  const handleCopyDetail = async (id: 'email' | 'whatsapp', value: string) => {
    const ok = await copyContactValue(value);
    if (ok) {
      setCopiedId(id);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedId(null);
        copiedTimerRef.current = null;
      }, 2000);
      onShowToast?.(
        id === 'email' ? 'Email copied to clipboard!' : 'WhatsApp number copied to clipboard!'
      );
    } else {
      onShowToast?.('Could not copy to clipboard.', true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-darkroom/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-obsidian border border-white/[0.12] rounded-sm shadow-2xl overflow-hidden lightbox-enter-fade"
      >
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-mono text-[11px] text-brass tracking-wide">
              Direct Contact &amp; Channels
            </p>
            <h2
              id="contact-modal-title"
              className="font-display text-2xl font-semibold tracking-tight text-zinc-100"
            >
              Get in Touch
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 text-justify">
              Select a channel to reveal direct contact details or explore more of my work.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close contact dialog"
            className="w-9 h-9 rounded-sm bg-charcoal hover:bg-brass hover:text-obsidian border border-white/10 text-zinc-200 flex items-center justify-center transition-colors duration-150 shrink-0 cursor-pointer"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {PROTECTED_CHANNELS.map((channel) => {
            const detail = revealed[channel.id];
            if (!detail) {
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => handleRevealChannel(channel.id)}
                  className="w-full text-left group flex items-center justify-between gap-4 px-6 py-4 bg-obsidian hover:bg-charcoal transition-colors duration-150 focus-visible:outline-none focus-visible:bg-charcoal cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-sm bg-charcoal group-hover:bg-brass/15 border border-white/[0.09] group-hover:border-brass/50 text-zinc-200 group-hover:text-brass flex items-center justify-center shrink-0 transition-colors duration-150">
                      {renderProtectedChannelIcon(channel.id)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="font-display text-sm sm:text-base font-medium text-zinc-100 group-hover:text-brass transition-colors duration-150">
                          {channel.name}
                        </span>
                        <span className="font-mono text-[11px] text-brass/85 truncate">
                          {channel.maskedPrompt}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {channel.description}
                      </p>
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="text-zinc-500 group-hover:text-brass transition-colors duration-150 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            }

            const isCopied = copiedId === channel.id;
            return (
              <div
                key={channel.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-charcoal/50"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-sm bg-brass/15 border border-brass/50 text-brass flex items-center justify-center shrink-0">
                    {renderProtectedChannelIcon(channel.id)}
                  </div>

                  <div className="min-w-0">
                    <div className="font-display text-sm font-medium text-zinc-100">
                      {channel.name}
                    </div>
                    <div className="font-mono text-xs text-brass mt-0.5 truncate tabular-nums select-all">
                      {detail.display}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-14 sm:pl-0">
                  <button
                    type="button"
                    onClick={() => handleCopyDetail(channel.id, detail.display)}
                    className={`px-3 py-1.5 rounded-sm border text-xs font-medium inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                        : 'bg-obsidian hover:bg-panel border-white/15 text-zinc-200 hover:border-white/30'
                    }`}
                  >
                    {isCopied ? (
                      <Check aria-hidden="true" className="w-3 h-3" />
                    ) : (
                      <Copy aria-hidden="true" className="w-3 h-3" />
                    )}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={detail.href}
                    target={channel.external ? '_blank' : undefined}
                    rel={channel.external ? 'noopener noreferrer' : undefined}
                    className="px-3 py-1.5 rounded-sm bg-brass hover:bg-brassHover text-obsidian text-xs font-semibold inline-flex items-center gap-1.5 transition-colors duration-150"
                  >
                    <span>{channel.openLabel}</span>
                    {channel.external ? (
                      <ExternalLink aria-hidden="true" className="w-3 h-3" />
                    ) : (
                      <ArrowRight aria-hidden="true" className="w-3 h-3" />
                    )}
                  </a>
                </div>
              </div>
            );
          })}

          {SOCIAL_CHANNELS.map((channel) => (
            <a
              key={channel.id}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 px-6 py-4 bg-obsidian hover:bg-charcoal transition-colors duration-150 focus-visible:outline-none focus-visible:bg-charcoal"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-sm bg-charcoal group-hover:bg-brass/15 border border-white/[0.09] group-hover:border-brass/50 text-zinc-200 group-hover:text-brass flex items-center justify-center shrink-0 transition-colors duration-150">
                  {renderSocialChannelIcon(channel.id)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="font-display text-sm sm:text-base font-medium text-zinc-100 group-hover:text-brass transition-colors duration-150">
                      {channel.name}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400 truncate">
                      {channel.handle}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {channel.description}
                  </p>
                </div>
              </div>

              <span
                aria-hidden="true"
                className="text-zinc-500 group-hover:text-brass transform group-hover:translate-x-0.5 transition-all duration-150 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-charcoal/50 flex items-center justify-between gap-4 text-[11px] font-mono text-zinc-500">
          <span>Cairo, Egypt · GCC &amp; Global Projects</span>
          <span className="hidden sm:inline">Esc to close</span>
        </div>
      </div>
    </div>
  );
};
