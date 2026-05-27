"use strict";

window.WorkoutTrackerConfig = {
  APP_VERSION: "1.1.1",
  STORAGE_KEY: "simpleWorkoutTracker.data.v4",
  PREVIOUS_STORAGE_KEYS: [
    "simpleWorkoutTracker.data.v3",
    "simpleWorkoutTracker.data.v2",
    "simpleWorkoutTracker.data.v1"
  ],
  WELCOME_STORAGE_KEY: "simpleWorkoutTracker.welcomeSeen.v1",
  DARK_MODE_STORAGE_KEY: "simpleWorkoutTracker.darkMode.v1",
  VIEW_STORAGE_KEY: "simpleWorkoutTracker.currentView.v1",
  BACKUP_TYPE: "simple-workout-tracker-backup",
  SCHEMA_VERSION: 4,
  VIEW_NAMES: ["exercises", "plans", "log", "history", "progress", "backup"],
  METRICS: {
    volume: { label: "Volume", unit: "kg", setKind: "strength", empty: "No strength volume yet." },
    bestWeight: { label: "Best weight", unit: "kg", setKind: "strength", empty: "No weight data yet." },
    reps: { label: "Total reps", unit: "reps", setKind: "strength", empty: "No rep data yet." },
    duration: { label: "Time", unit: "min", setKind: "duration", empty: "No time data yet." }
  },
  SOCIAL_LINKS: [
    { href: "https://github.com/savutro", label: "GitHub", icon: "github" },
    { href: "https://savutro.dev", label: "Website", title: "savutro.dev", icon: "link" },
    { href: "https://www.linkedin.com/in/savutro", label: "LinkedIn", icon: "linkedin" }
  ]
};
