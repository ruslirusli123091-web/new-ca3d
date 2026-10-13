# CA3D SvelteKit (Cloudflare Pages)

Clone SvelteKit dari project React CA3D dengan UI dan route publik yang sama:

- `/` — home/banner, rilis terbaru, movie, popular
- `/category/series`, `/category/movie`
- `/schedule`
- `/synopsis/:id`
- `/watch/:id/:ep`
- `/profile` — koleksi lokal (bookmark, riwayat, nama tampilan)
- `/admin` — satu-satunya halaman yang butuh login

## Tanpa akun user (by design)

Login/register member **sengaja dihapus**. Bookmark, riwayat tontonan, dan nama
tampilan komentar disimpan di `localStorage` masing-masing pengunjung:

- Tidak ada data pribadi yang tersimpan di server
- Tidak ada endpoint login/register user yang bisa diserang (brute force,
  credential stuffing, session hijacking) — permukaan serangan hilang
- Tidak ada tabel `users` di D1
- Setiap pengunjung bisa **backup/restore** koleksinya lewat halaman `/profile`
  (export/import JSON), jadi pindah perangkat tetap mungkin tanpa akun

Yang tetap butuh autentikasi hanya **admin panel**.

## Jalankan lokal

```bash
npm install
npm run dev
```

Build Cloudflare:

```bash
npm run build
npm run preview
```

## Cloudflare Pages

1. Buat Pages project dari repository/folder ini.
2. Framework preset: **SvelteKit**.
3. Build command: `npm run build`.
4. Output directory: `.svelte-kit/cloudflare`.
5. Pastikan file root `_headers` dan `_redirects` ikut ter-deploy.
6. Buat D1 database lalu isi `database_id` pada `wrangler.jsonc`.
7. Bind D1 dengan nama **DB** dan KV (opsional push notification) dengan nama **SUBSCRIPTIONS**.
8. Jalankan migrasi:

```bash
npx wrangler d1 execute ca3d-db --remote --file=./schema.sql
```

### Environment variables / secrets

Set sebagai **Secrets**, bukan source code (lihat `.env.example`):

```bash
npx wrangler pages secret put SESSION_SECRET
npx wrangler pages secret put TURNSTILE_SECRET_KEY
npx wrangler pages secret put TELEGRAM_BOT_TOKEN       # optional
npx wrangler pages secret put TELEGRAM_CHAT_ID         # optional
```

Variable biasa di `wrangler.jsonc`:

- `SITE_URL` — domain publik, mis. `https://ca3d.site`
- `TURNSTILE_SITE_KEY` — public key Turnstile; boleh kosong saat development

Generate password admin yang aman:

```bash
node scripts/hash-password.mjs "PasswordPanjangDanUnik"
```

Lalu masukkan hasilnya ke D1 (hash PBKDF2, jangan plain text):

```sql
INSERT OR REPLACE INTO admins (username, password)
VALUES ('admin', 'pbkdf2$...');
```

## Proteksi keamanan yang tersedia

- Session cookie admin `HttpOnly`, `Secure` (HTTPS), `SameSite=Lax`, signed HMAC-SHA256, TTL 7 hari.
- Password admin PBKDF2-SHA256 120.000 iterasi + salt acak; legacy SHA-256 dimigrasikan saat login sukses.
- **Tidak ada akun user**, sehingga tidak ada endpoint kredensial publik untuk diserang.
- D1 prepared statements untuk semua query (tidak ada SQL concatenation dari input).
- Rate limit per IP/bucket: auth, read, write, comment, view. Memakai binding Cloudflare Rate Limiting jika tersedia, dengan fallback sliding window per isolate.
- Cloudflare Turnstile untuk login admin dan komentar jika secret dikonfigurasi.
- Honeypot field untuk mendeteksi bot form (auth modal dan form komentar).
- Deteksi User-Agent scraper dan larangan bulk JSON API untuk search crawler; halaman publik tetap SEO-friendly.
- Validasi panjang/charset input, sanitasi URL, profanity filter, batas jumlah item/episode/komentar.
- Nama tampilan komentar disanitasi (strip `<>"'`\\/`) dan bisa diblokir lewat ban list admin.
- Same-origin guard untuk semua state-changing endpoint.
- Security headers: CSP, HSTS (production), `X-Content-Type-Options`, frame protection, COOP, Referrer Policy, Permissions Policy, no-store API.
- API tidak memakai CORS `*`, tidak menerima password admin di header/body, dan tidak mengekspos daftar hash admin.
- Video iframe diberi sandbox + `referrerpolicy="no-referrer"`.
- Sitemap dinamis dari D1 dan `robots.txt` yang melarang `/api`, `/admin`, `/profile`.

> Tidak ada sistem yang bisa menjamin “anti hacking 100%”. Aktifkan Cloudflare WAF, Bot Fight Mode/Super Bot Fight Mode, Rate Limiting Rules, Turnstile, dan 2FA pada akun Cloudflare untuk lapisan edge tambahan.

## Referensi backend lama

Endpoint baru memakai `/api/*` pada Worker SvelteKit sendiri. `E:\ca3d\worker.js` dipakai sebagai referensi kontrak data D1 dan fitur (donghua, comments, views, banned users, notification), tetapi secret hardcoded dan CORS wildcard sengaja tidak dibawa ke clone baru. Endpoint `/api/member/*` juga dihapus karena akun user sudah tidak ada.

