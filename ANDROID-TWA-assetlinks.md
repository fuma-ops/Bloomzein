# Digital Asset Links (TWA ↔ domain verification)

`public/.well-known/assetlinks.json` proves bloomzein.com and the Android app
are the same owner, so the Play Store app (Trusted Web Activity) runs
full-screen without the browser address bar.

Served at: https://www.bloomzein.com/.well-known/assetlinks.json

## Current state
Filled from the PWABuilder package:
- package_name: `com.bloomzein.twa`
- sha256 (PWABuilder upload key): `13:D0:FA:05:...:6A:06`

## IMPORTANT — after you upload the .aab to Play Console
New apps use **Google Play App Signing**: Google re-signs the app with its OWN
key, so the fingerprint that verifies in production is DIFFERENT from the
PWABuilder one above.

1. Upload the .aab, then go to:
   Play Console → your app → **Setup → App integrity → App signing** →
   copy the **SHA-256 certificate fingerprint** of the *App signing key*.
2. Add it to the `sha256_cert_fingerprints` array in assetlinks.json (keep both
   — upload key + app signing key — so it verifies before and after re-signing),
   then redeploy.

## Verify
Open the URL (must return JSON, HTTP 200) and test with:
https://developers.google.com/digital-asset-links/tools/generator

## Secrets (DO NOT COMMIT)
The signing keystore + passwords from the PWABuilder zip (signing.keystore,
signing-key-info.txt) must be kept private and are NOT stored in this repo.
