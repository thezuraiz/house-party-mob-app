# Universal Links Verification Files

These files enable Universal Links (iOS) and App Links (Android) so that HTTPS links can open the HouseParty app directly.

## Files

### `apple-app-site-association`
**For:** iOS Universal Links
**Host at:** `https://houseparty.app/.well-known/apple-app-site-association`

**Configuration Required:**
1. Replace `TEAMID` with your Apple Developer Team ID
   - Find in: Apple Developer Account → Membership → Team ID
   - Example: `AB12CD34EF`

2. Final format should be:
   ```json
   "appID": "AB12CD34EF.com.houseparty.scoretracker"
   ```

**Verification:**
```bash
curl https://houseparty.app/.well-known/apple-app-site-association
```

### `assetlinks.json`
**For:** Android App Links
**Host at:** `https://houseparty.app/.well-known/assetlinks.json`

**Configuration Required:**
1. Replace `REPLACE_WITH_YOUR_RELEASE_SHA256_FINGERPRINT` with your actual SHA256 fingerprint

2. Get fingerprint from release keystore:
   ```bash
   keytool -list -v -keystore release.keystore -alias release-key
   ```

3. Copy SHA256 value (format: `AB:CD:EF:12:34:...`)
4. Remove colons and use uppercase
5. Example: `ABCDEF123456789...`

**Verification:**
```bash
curl https://houseparty.app/.well-known/assetlinks.json
```

## Hosting Requirements

Both files must be:
- Accessible via HTTPS (not HTTP)
- Served with `Content-Type: application/json`
- No authentication required (publicly accessible)
- No redirects (direct 200 OK response)
- Served from root domain (`houseparty.app`, not a subdomain)

## Why These Files Are Needed

Without these verification files:
- Universal Links will NOT work
- HTTPS links will open in browser instead of app
- Email verification links will fail
- Password reset links will fail
- Users will see "Unable to open link" errors

## Testing

After hosting these files:

### iOS:
1. Open Safari on iPhone
2. Navigate to: `https://houseparty.app/auth/confirm`
3. Should see banner to open in HouseParty app

### Android:
1. Open Chrome on Android
2. Navigate to: `https://houseparty.app/auth/confirm`
3. Should prompt to open in HouseParty app

## Debugging

### iOS Not Working:
- Verify AASA file is accessible and valid JSON
- Check Team ID is correct in the file
- Try deleting and reinstalling the app
- Links must be tapped in Safari/Mail (not Notes)
- Wait 15 minutes after hosting file (iOS caches verification)

### Android Not Working:
- Verify assetlinks.json is accessible and valid JSON
- Check SHA256 fingerprint matches release keystore
- Clear app data: Settings → Apps → HouseParty → Storage → Clear Data
- Enable "Open supported links": Settings → Apps → HouseParty → Set as default
- Use release build (not debug build) for testing

## See Also

See `UNIVERSAL_LINKS_SETUP_GUIDE.md` in project root for complete setup instructions.
