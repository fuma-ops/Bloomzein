# Digital Asset Links (TWA ↔ domain verification)

`assetlinks.json` proves that this website (bloomzein.com) and the Android app
are the same owner, so the Play Store app (a Trusted Web Activity) runs
full-screen **without the browser address bar**.

## How to finish it (2 values to paste)

When you package the PWA with **PWABuilder** (or Bubblewrap), it generates the
exact `assetlinks.json` for you. Two values must match your final app:

1. **`package_name`** — the Android application id you chose in PWABuilder
   (e.g. `com.bloomzein.app`).
2. **`sha256_cert_fingerprints`** — the SHA-256 of the key that **signs** the app.
   Use the **App signing key** fingerprint from
   **Play Console → your app → Setup → App integrity → App signing**
   (not the upload key). PWABuilder also prints a fingerprint for its generated key.

Replace the two `REPLACE_WITH_...` placeholders in `assetlinks.json` with those
values (or just overwrite the whole file with the one PWABuilder gives you),
then redeploy. It will be served at:

    https://www.bloomzein.com/.well-known/assetlinks.json

## Verify

Open that URL in a browser (must return raw JSON, HTTP 200), then check with
Google's tester:
https://developers.google.com/digital-asset-links/tools/generator
