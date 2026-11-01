# Putting Second Show online

This takes about 15 minutes and no payment card. You need two free accounts: Vercel (runs the site) and Internet Archive (hosts the films).

## 1. Put the site on Vercel

1. Open [vercel.com/new](https://vercel.com/new) and import the `secondShow` GitHub repository.
2. Before pressing **Deploy**, open **Environment Variables** and add:

| Setting | Value |
| --- | --- |
| `ADMIN_PASSWORD` | A password of at least 12 characters that you use nowhere else |
| `SESSION_SECRET` | The output of `openssl rand -hex 32` |

3. Press **Deploy**. Vercel shows your address, such as `https://second-show.vercel.app`.

## 2. Connect the catalogue

The catalogue holds film details, the review queue and reports. It uses Vercel's own free storage.

1. In your Vercel project, open **Storage** and create a **Blob** store.
2. Choose **Private** access. This matters, because reports contain people's email addresses.
3. Connect it to this project. Vercel adds the setting for you.
4. Open **Deployments** and choose **Redeploy** on the latest one.

Every later push to `main` updates the site. Keep your password and secret in Vercel only, because the repository is public.

## 3. Add your first film

1. Create a free account at [archive.org](https://archive.org/account/signup). It asks for an email address, not a card.
2. On any device, open [archive.org/upload](https://archive.org/upload) and pick your film. Set its licence honestly on that page.
3. Wait for the upload to finish, then copy the film's page address. It looks like `https://archive.org/details/your-film`.
4. Open `https://your-site/admin` and sign in.
5. Choose **Add a film**, paste the address, and press **Find it**.
6. Check the preview plays with sound, correct the details, and press **Publish**.

If the site says there is no browser-ready version yet, Internet Archive is still converting the file. This can take from minutes to a day. Try the same link again later.

## How other people add films

They upload to Internet Archive themselves, then paste their link at `/submit`. Their film waits in `/admin` until you publish it.

Open `/admin` to watch each submission, check its proof link, publish or delete it, and read reports from `/takedown`. A film being free to download does not make it public domain.

## Limits

- **What Internet Archive accepts:** films you own or that are in the public domain. It can remove anything that breaks its rules, or after a rights complaint, and the film then stops playing here too.
- **Deleting from this site:** this only takes the film off your board. The file stays on Internet Archive until you remove it there.
- **Speed:** films start in a few seconds, slower than a paid service. Test streams reached about 2 MB/s.
- **Vercel Blob free plan:** 1 GB of storage and a limited number of operations a month. This site only stores small text records and caches them, so normal use stays well inside it. If the limit is passed, Blob stops working for up to 30 days, and you are not billed.
- **Spam protection:** public submissions stop at 10 films waiting for review, and reports stop at 50 open. Set `PUBLIC_UPLOADS=closed` to turn off public submissions.
