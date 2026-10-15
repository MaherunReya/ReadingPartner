// Simple line icons. They take their colour from the surrounding text (currentColor),
// so they follow the theme and never glare. Use <Icon name="cards" className="size-5" />.
const PATHS = {
  cards: <><rect x="2.5" y="8" width="13" height="12" rx="2" /><path d="M7 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.5" /></>,
  sparkle: <><path d="M10 3.5l1.7 4.8 4.8 1.7-4.8 1.7L10 16.5l-1.7-4.8L3.5 10l4.8-1.7z" /><path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></>,
  pencil: <><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" /><path d="M14.5 6.5l3 3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chart: <><path d="M3.5 3.5v17h17" /><path d="M7.5 15l4-4.5 3 3 5-6" /></>,
  flame: <path d="M12 3c.6 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-1.8.8-3 2-4 .2 1.6 1 2.5 2 2.5C11 8.5 10.5 6 12 3z" />,
  moon: <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5M9.5 3h5" /></>,
  note: <><path d="M5 3.5h14a1 1 0 0 1 1 1V15l-5.5 5.5H5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M14.5 20.5V16a1 1 0 0 1 1-1H20M8 8h8M8 12h4" /></>,
  upload: <path d="M12 16V4.5M7 9l5-4.5L17 9M4.5 19.5h15" />,
  trash: <path d="M4 7h16M9.5 11v6M14.5 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M8.5 5v14M15.5 5v14" />,
  reset: <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3.5 8.5M3.5 3.5v5h5" />,
  skip: <path d="M5 5l9 7-9 7zM18.5 5v14" />,
  coffee: <><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M12 3.5v2" /></>,
  bolt: <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" />,
  book: <path d="M4.5 19a2.5 2.5 0 0 1 2.5-2.5h13V3H7a2.5 2.5 0 0 0-2.5 2.5zM7 16.5V21h13" />,
  pin: <path d="M12 16.5V22M8.5 3h7l-1 6 3 3.5v2H6.5v-2L9.5 9z" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H4.5v2A3 3 0 0 0 8 11M16 6h3.5v2a3 3 0 0 1-3.5 3M12 13v4M9 20.5h6M10 17h4v3.5h-4z" /></>,
  headphones: <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H5.5a1.5 1.5 0 0 1-1.5-1.5zM20 15h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M4 5h16v11H9.5L5 20v-4H4z" />,
  gift: <><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" /><path d="M12 7c-1.5-3-5-3.5-5-1.5S10 7 12 7zM12 7c1.5-3 5-3.5 5-1.5S14 7 12 7z" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  rocket: <><path d="M14.5 4.5c3.5-.5 5 1 5 1s1.5 1.5 1 5L15 16l-4.5-4.5z" /><path d="M10.5 11.5L7 12l-2.5 2.5L8 15M12.5 16.5L12 20l2.5-2.5L15 14M5 19l-1.5 1.5" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
};

export default function Icon({ name, className = "size-5", filled = false, strokeWidth = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] ?? null}
    </svg>
  );
}
