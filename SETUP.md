# Putting Second Show online

This takes about 30 minutes. You need two free accounts: Cloudflare (stores the films) and Vercel (runs the site).

## 1. Create the storage on Cloudflare

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Open **R2 Object Storage** and enable it. Cloudflare may ask for a payment method even for the free plan.
3. Create a bucket named `second-show`.
4. Go to **R2 > Manage API Tokens > Create API Token**. Choose **Object Read & Write** and limit it to the `second-show` bucket.
5. Copy these three values. The secret is shown only once:
   - Account ID
   - Access Key ID
   - Secret Access Key

## 2. Put the site on Vercel

1. Open [vercel.com/new](https://vercel.com/new) and import the `secondShow` GitHub repository.
2. Before pressing **Deploy**, open **Environment Variables** and add:

| Setting | Value |
| --- | --- |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | From step 1 |
| `R2_BUCKET` | `second-show` |
| `ADMIN_PASSWORD` | A password of at least 12 characters that you use nowhere else |
| `SESSION_SECRET` | The output of `openssl rand -hex 32` |

Do not add `R2_ENDPOINT`.

3. Press **Deploy**. Vercel shows your address, such as `https://second-show.vercel.app`.

Every later push to `main` updates the site. Keep these values in Vercel only, because the repository is public.

## 3. Allow uploads from your site

On your computer, in this folder, copy the settings file:

```bash
cp .env.example .env.local
```

Fill in the four `R2_` values in `.env.local`, and set `SITE_ORIGINS` to your Vercel address. Git ignores this file, so it will not be pushed. Then run:

```bash
npm install
```

```bash
npm run setup:r2
```

Skipping this makes every upload fail straight away. Run it again if the address changes.

## 4. Upload your first film from the other device

1. On that device, open `https://your-site/admin` and sign in.
2. Choose **Upload a film**, then pick the file.
3. Check the preview plays with sound, then fill in the details.
4. Press **Upload and publish** and keep the tab open.

If the upload stops, pick the same file on the same device and browser. It continues from where it stopped.

## Files that will not play

Browsers play MP4 (H.264 video, AAC audio) and WebM. The site refuses most other files before uploading them. Many downloaded `.mkv` and `.avi` files need converting first, with [HandBrake](https://handbrake.fr) or:

```bash
ffmpeg -i "input.mkv" -c:v libx264 -crf 22 -preset medium -c:a aac -movflags +faststart film.mp4
```

The site cannot detect unsupported audio inside an MP4, so unmute the preview before uploading. Some H.265 files also play only in certain browsers. Convert those too, so everyone can watch.

## Limits

- **Storage:** R2 is free up to 10 GB, about six films of your size. The site stops all uploads at 9.5 GB, so it cannot run up a bill by itself. To go further, raise `MAX_TOTAL_GB`. R2 charges about $0.015 per GB per month above the free 10 GB.
- **Public uploads:** these wait in `/admin` until you publish them. Set `PUBLIC_UPLOADS=closed` to turn them off.
- **Review queue:** public submissions stop at 10 films waiting for review, 5 uploads running at once, and 4 GB per file.
- **Abandoned uploads:** R2 deletes unfinished uploads after 7 days by default. Until then they use storage, but the site's total does not count them.

## Reviewing what people send

Open `/admin` to see the queue, watch a submission, publish or delete it, and read reports from `/takedown`. Check every proof link before publishing. A film being free to download does not make it public domain.
