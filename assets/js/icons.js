"use strict";

window.WorkoutTrackerIcons = {
  icon(name) {
    const icons = {
      chevronUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
      chevronDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
      trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
      github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3c3 0 6-2 6-6a5 5 0 0 0-1.4-3.6A4.6 4.6 0 0 0 18.5 2s-1.2 0-3.5 1.5a12 12 0 0 0-6 0C6.7 2 5.5 2 5.5 2a4.6 4.6 0 0 0-.1 3.4A5 5 0 0 0 4 9c0 4 3 6 6 6a4.8 4.8 0 0 0-1 3v4M9 18c-4.5 2-5-2-7-2"/></svg>',
      link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>',
      linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2zM4 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>'
    };
    return icons[name] || "";
  }
};
