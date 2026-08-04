import path from "path";

// Root directory for tenant media uploads.
//
// This MUST be environment-aware: prod and staging run from different working
// trees but historically both hardcoded "/opt/nexis/uploads", so the staging
// app wrote uploaded photos straight into PROD's uploads dir (cross-environment
// pollution). Driving it from an env var fixes that with zero risk to prod.
//
//   UPLOADS_DIR  — absolute path to this deployment's uploads dir.
//   default      — "/opt/nexis/uploads", the original prod location, so prod
//                  keeps its exact existing path with no env change required.
//
// Staging sets UPLOADS_DIR=/opt/nexis-staging/uploads in its own .env, so it
// now writes to (and serves from) its own directory.
export const UPLOADS_ROOT = process.env.UPLOADS_DIR?.trim()
  ? path.resolve(process.env.UPLOADS_DIR.trim())
  : "/opt/nexis/uploads";
