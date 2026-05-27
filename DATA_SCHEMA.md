# Workout Tracker Data Schema

Backups use JSON and are versioned. The app currently writes `schemaVersion: 4`.

```json
{
  "type": "simple-workout-tracker-backup",
  "schemaVersion": 4,
  "exportedAt": "2026-05-18T12:00:00.000Z",
  "data": {
    "schemaVersion": 4,
    "createdAt": "2026-05-18T12:00:00.000Z",
    "updatedAt": "2026-05-18T12:00:00.000Z",
    "exercises": [],
    "plans": [],
    "sessions": []
  }
}
```

Version 1, 2, and 3 backups are still importable. They are migrated to version 4 on import.

## Core Collections

### `exercises`

The exercise index is the canonical source for exercise names and setup notes. Plans reference exercises by `exerciseId`.
It also owns the tracking type, so set editors can be rendered without per-set type controls.

```json
{
  "id": "uuid",
  "name": "Bench Press",
  "kind": "strength",
  "notes": "Rack height 7",
  "createdAt": "iso timestamp",
  "updatedAt": "iso timestamp",
  "archivedAt": null
}
```

New exercise records are deleted rather than archived. `archivedAt` remains in the schema so older backups can be imported safely.

Supported exercise kinds:

- `strength`: sets are tracked as reps x weight
- `duration`: sets are tracked as time in seconds or minutes

### `plans`

Plans contain ordered plan items. Each item points at one exercise and stores the current target sets for the next workout.

```json
{
  "id": "uuid",
  "name": "Push Day",
  "notes": "",
  "items": [
    {
      "id": "uuid",
      "exerciseId": "uuid",
      "targetSets": [],
      "sortIndex": 0
    }
  ],
  "createdAt": "iso timestamp",
  "updatedAt": "iso timestamp",
  "archivedAt": null
}
```

Archived plans remain in the app and can be restored from the Plans view.

Plans can also be deleted. Deleting a plan does not delete historical workout logs because sessions keep their own snapshots.

### `sessions`

Completed workouts are immutable snapshots. `plannedSets` stores the plan target before logging. `loggedSets` stores the completed result. After saving a session, the source plan item is updated to the logged sets.

```json
{
  "id": "uuid",
  "planId": "uuid",
  "planName": "Push Day",
  "startedAt": "iso timestamp",
  "completedAt": "iso timestamp",
  "sessionNotes": "",
  "createdAt": "iso timestamp",
  "sourcePlanUpdatedAt": "iso timestamp",
  "entries": [
    {
      "id": "uuid",
      "planItemId": "uuid",
      "exerciseId": "uuid",
      "exerciseName": "Bench Press",
      "exerciseKind": "strength",
      "exerciseNotes": "Rack height 7",
      "notes": "Felt strong",
      "plannedSets": [],
      "loggedSets": []
    }
  ]
}
```

## Set Records

Sets are structured for analytics. New data uses only two set kinds.

### Strength

```json
{
  "id": "uuid",
  "kind": "strength",
  "reps": 3,
  "weight": 20,
  "weightUnit": "kg",
  "duration": null,
  "durationUnit": null
}
```

### Duration

```json
{
  "id": "uuid",
  "kind": "duration",
  "reps": null,
  "weight": null,
  "weightUnit": null,
  "duration": 45,
  "durationUnit": "sec"
}
```

Supported units:

- Strength: `kg`, `lb`
- Duration: `sec`, `min`

## Analytics

Progress charts group by `exerciseId`, use `sessions[].completedAt` as the timeline, and read values from `sessions[].entries[].loggedSets`.

Derived metrics:

- `volume`: sum of `reps * weight`, converted to kg when needed
- `bestWeight`: highest single-set weight, converted to kg when needed
- `reps`: sum of reps across strength sets
- `duration`: total duration in minutes
