import React, { useEffect } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ContactChannel {
  id: string;
  name: string;
  handle: string;
  description: string;
  href: string;
  iconClass: string;
  external: boolean;
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    id: 'email',
    name: 'Email',
    handle: 'rhhendy@gmail.com',
    description: 'Project inquiries & direct correspondence',
    href: 'mailto:rhhendy@gmail.com',
    iconClass: 'fa-solid fa-envelope',
    external: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    handle: '+20 100 618 3769',
    description: 'Direct chat & quick project discussions',
    href: 'https://wa.me/201006183769',
    iconClass: 'fa-brands fa-whatsapp',
    external: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    handle: 'linkedin.com/in/ramihendi',
    description: 'Professional experience & network',
    href: 'https://www.linkedin.com/in/ramihendi/',
    iconClass: 'fa-brands fa-linkedin-in',
    external: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'facebook.com/ramihendi.artworks',
    description: 'Artworks & studio updates',
    href: 'https://www.facebook.com/ramihendi.artworks',
    iconClass: 'fa-brands fa-facebook-f',
    external: true,
  },
  {
    id: 'behance',
    name: 'Behance',
    handle: 'behance.net/ramihendi',
    description: 'Visual case studies & selected works',
    href: 'https://www.behance.net/ramihendi',
    iconClass: 'fa-brands fa-behance',
    external: true,
  },
];

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

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

  if (!isOpen) return null;

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
              Select a channel to reach out directly or explore more of my work.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close contact dialog"
            className="w-9 h-9 rounded-sm bg-charcoal hover:bg-brass hover:text-obsidian border border-white/10 text-zinc-200 text-sm flex items-center justify-center transition-colors duration-150 shrink-0 cursor-pointer"
          >
            <i aria-hidden="true" className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {CONTACT_CHANNELS.map((channel) => (
            <a
              key={channel.id}
              href={channel.href}
              target={channel.external ? '_blank' : undefined}
              rel={channel.external ? 'noopener noreferrer' : undefined}
              className="group flex items-center justify-between gap-4 px-6 py-4 bg-obsidian hover:bg-charcoal transition-colors duration-150 focus-visible:outline-none focus-visible:bg-charcoal"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-sm bg-charcoal group-hover:bg-brass/15 border border-white/[0.09] group-hover:border-brass/50 text-zinc-200 group-hover:text-brass flex items-center justify-center shrink-0 transition-colors duration-150">
                  <i aria-hidden="true" className={`${channel.iconClass} text-base`}></i>
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
                className="text-zinc-500 group-hover:text-brass transform group-hover:translate-x-0.5 transition-all duration-150 shrink-0 text-xs"
              >
                <i
                  className={
                    channel.external
                      ? 'fa-solid fa-arrow-up-right-from-square'
                      : 'fa-solid fa-arrow-right'
                  }
                ></i>
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
