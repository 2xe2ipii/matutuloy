# Remote vs Local Comparison

This document outlines the differences between the local workspace and the remote `origin/main` branch as of May 2, 2026.

## Summary of Changes

The local environment contains significant architectural and feature updates that have not yet been pushed to the remote repository. The primary focus of these changes is the integration of **Firebase Storage** and a complete redesign of the **Planning Gallery/Dashboard**.

---

## 1. Firebase Storage Integration
The local version has moved away from storing images as Base64 strings in the Realtime Database, opting for Firebase Storage to improve performance and data efficiency.

- **`src/firebase.ts`**: Added initialization and export of `storage` using `getStorage(app)`.
- **`src/App.tsx`**: Updated `saveNewIcon` to upload cropped avatars to Firebase Storage (`avatars/` path) and save the resulting download URL to the user's profile in the Realtime Database.
- **`src/canvasUtils.ts`**: Added `dataURLtoBlob` helper function to facilitate the conversion of Base64 strings (from the cropper) into uploadable Blobs.

## 2. Planning Dashboard & Gallery Redesign
There is a major discrepancy in `src/components/PlanningDashboard.tsx`.

- **Remote**: Contains a functional trip listing and management system (Create/Edit/Delete trips).
- **Local**: The file has been largely overwritten with a new **Scrapbook-style Gallery** implementation (`PlanGallery` component). 
    - **Albums**: Support for creating and managing photo albums within a trip.
    - **Themes**: Customizable backgrounds (Patterns like dots, grid, cork, paper; Solid colors; Custom images).
    - **Visual Style**: Uses a "messy" scrapbook aesthetic with deterministic rotation and "Washi tape" overlays for photos.
    - **Storage**: Photos are uploaded to Firebase Storage under `plans/{planId}/gallery/`.

## 3. Component & Layout Updates
- **`src/App.tsx`**:
    - Enhanced the avatar upload UI with a loading state (`isUploading`).
    - Cleaned up comments and refined the main layout structure.
    - Integrated the new `storage` and `canvasUtils` helpers.

---

## Technical Debt / Observation
- **Naming Mismatch**: In the local workspace, `src/components/PlanningDashboard.tsx` now exports a component named `PlanGallery`. This suggests a potential refactor in progress or a file naming inconsistency that should be addressed before merging.
- **Untracked Files**: `GEMINI.md` exists locally but is not present in the remote repository.

## Comparison Stat
| Metric | Difference (Local vs Remote) |
| :--- | :--- |
| **Files Modified** | 4 (`App.tsx`, `canvasUtils.ts`, `PlanningDashboard.tsx`, `firebase.ts`) |
| **Lines Added** | ~625 |
| **Lines Removed** | ~360 |
| **New Dependencies** | Firebase Storage (already in package, now utilized) |
