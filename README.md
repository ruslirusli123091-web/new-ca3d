# CA3D SvelteKit (Cloudflare Pages)

Clone SvelteKit dari project React CA3D. Konten dirender **server-side (SSR)**
untuk SEO, dan seluruh permukaan autentikasi publik sudah dihapus.

## Halaman

| Route | SSR | Catatan |
|---|---|---|
| `/` | Ya | Banner, rilis terbaru, movie, sidebar |
| `/category/series` | Ya | Arsip series |
| `/category/movie` | Ya | Arsip movie |
| `/schedule` | Ya | Jadwal mingguan |
| `/synopsis/:id` | Ya | Detail + daftar episode + JSON-LD |
| `/watch/:id/:ep` | Ya | Player + navigasi episode + JSON-LD |
| `/profile` | Ya | Koleksi lokal (bookmark, riwayat, nama) — `noindex` |
| `/admin` | Ya | Satu-satunya halaman ber-login |

## Arsitektur tanpa akun user

Login/register member **tidak ada**. Bookmark, riwayat tontonan, dan nama
tampilan disimpan di `localStorage` masing-masing pengunjung:

- Tidak ada data pribadi tersimpan di server
- Tidak ada endpoint kredensial publik yang bisa diserang
- Tidak ada tabel `users` di D1
- Pengunjung bisa backup/restore koleksinya lewat `/profile` (export/import JSON)

Yang butuh autentikasi hanya **admin panel**, dan kredensialnya berasal dari
**environment variable**, bukan database:

| Variable | Fungsi |
|---|---|
| `ADMIN_USERNAME` | Nama login admin |
| `ADMIN_PASSWORD` | Password admin (plain atau `pbkdf2$...`) |
| `SESSION_SECRET` | Menandatangani cookie sesi admin (HMAC-SHA256) |

Karena tidak ada tabel `admins`, dump database yang bocor **tidak mengekspos
kredensial apa pun**.

## Jalankan lokal

```bash
npm install
npm run db:migrate:local      # buat tabel D1 lokal
npm run dev
```

Build Cloudflare:

```bash
npm run build
npm run preview
```

## Cloudflare Pages

1. Buat Pages project dari repository ini.
2. Framework preset: **SvelteKit**.
3. Build command: `npm run build`.
4. Output directory: `.svelte-kit/cloudflare`.
5. Buat D1 database, isi `database_id` di `wrangler.jsonc`.
6. Bind D1 dengan nama **DB**; KV (opsional, push notification) sebagai **SUBSCRIPTIONS**.
7. Jalankan migrasi:

```bash
npm run db:migrate:remote
```

Jika database sudah pernah dibuat dengan schema lama:

```bash
npm run db:cleanup:remote   # hapus tabel users/admins/comments/sessions
```

### Secrets

```bash
npx wrangler pages secret put SESSION_SECRET
npx wrangler pages secret put ADMIN_USERNAME
npx wrangler pages secret put ADMIN_PASSWORD
```

Atau untuk lokal, salin `.env.example` menjadi `.dev.vars` dan isi nilainya.

`SESSION_SECRET` bisa digenerate dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Password admin boleh disimpan sebagai hash agar tidak plain text:

```bash
node scripts/hash-password.mjs "PasswordPanjangDanUnik"
# lalu set ADMIN_PASSWORD=pbkdf2$...
```

## SEO

- **SSR penuh untuk konten.** HTML yang dikirim server sudah berisi judul,
  sinopsis, daftar episode, dan grid donghua — bukan shell kosong. Terverifikasi:
  HTML home ±27 KB dengan konten nyata.
- Halaman yang butuh interaksi (search, pagination, carousel) tetap dihidrasi
  di klien setelah HTML pertama.
- Meta lengkap per halaman: `<title>`, `description`, `canonical`, Open Graph,
  Twitter Card.
- **JSON-LD** di halaman detail (`TVSeries`/`Movie`) dan episode (`TVEpisode`).
- `sitemap.xml` dinamis dari D1 (hanya item yang sudah tayang).
- `robots.txt` mengizinkan halaman publik dan melarang `/api/`, `/admin`, `/profile`.
- URL episode memakai `<a href>` dan `rel="prev"`/`rel="next"` supaya bisa di-crawl.

## Keamanan

**Autentikasi**
- Kredensial admin dari env, bukan database.
- Cookie sesi `HttpOnly`, `Secure`, `SameSite=Lax`, signed HMAC-SHA256, TTL 7 hari.
- Perbandingan kredensial constant-time (tidak bisa ditebak lewat timing).
- Password bisa PBKDF2-SHA256 120.000 iterasi + salt.
- Audit log percobaan login admin (berhasil/gagal) di tabel `audit_log`.

**Rate limiting**
- Binding Cloudflare Rate Limiting dipakai sebagai batas kasar terdistribusi.
- Ditambah sliding window per-isolate yang menegakkan aturan per-bucket:
  `auth` 8/5 menit, `read` 120/menit, `write` 30/menit, `view` 60/menit.
- Terverifikasi: 8 percobaan login gagal, lalu `429`.

**Anti-scraping / anti-bot**
- User-Agent scraper (`python-requests`, `curl`, `Scrapy`, `axios`, dll) diblokir
  dari API — terverifikasi `403`.
- Crawler mesin pencari boleh mengambil HTML (SEO) tapi **tidak** API data massal.
- API **tidak** memakai `Cache-Control: public`. Ini penting: cache edge yang
  publik akan melayani respons sebelum Worker berjalan, sehingga penyerang bisa
  memanaskan cache dengan request browser lalu scraping dengan client apa pun
  dan melewati filter bot sepenuhnya. Sekarang `private, max-age=30`.

**Validasi & injeksi**
- Semua query D1 memakai prepared statement.
- SQL injection pada `?id` terverifikasi aman (payload `OR '1'='1`,
  `UNION SELECT`, `DROP TABLE` → `404`, tabel tetap utuh).
- Sanitasi input: kontrol karakter dibuang, panjang dibatasi, charset ID dibatasi,
  URL `javascript:`/`data:` diblokir, episode maksimal 5000, batch maksimal 20000.
- Path traversal terverifikasi `404`.
- Tanpa sesi admin, semua endpoint tulis mengembalikan `401`.

**Transport & header**
- CSP ketat (`script-src 'self'`, tanpa CDN script pihak ketiga).
- HSTS di production, `nosniff`, `X-Frame-Options`, COOP, Referrer Policy,
  Permissions Policy.
- Same-origin guard untuk semua endpoint yang mengubah data — terverifikasi
  request `Origin: https://evil-site.com` ditolak `403`.
- Iframe player diberi `sandbox` dan `referrerpolicy="no-referrer"`.
- API merespons dengan `no-store`.

> Tidak ada sistem yang bisa menjamin "anti hacking 100%". Aktifkan juga WAF,
> Bot Fight Mode / Super Bot Fight Mode, Rate Limiting Rules, dan 2FA akun
> Cloudflare sebagai lapisan edge tambahan.

## Referensi backend lama

`E:\ca3d\worker.js` dipakai sebagai referensi kontrak data D1 (donghua, views),
tetapi secret hardcoded (token Telegram, VAPID private key, password admin) dan
CORS wildcard sengaja tidak dibawa. Endpoint `/api/member/*`, `/api/chat`, dan
`/api/users` dihapus karena akun user dan fitur komentar sudah tidak ada.
