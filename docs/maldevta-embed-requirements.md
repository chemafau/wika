# Spesifikasi Improvement Embed Chat — Permintaan ke Maldevta

**Project ID terkait:** `prj_a5746e6d2deb36c65aad`
**Aplikasi parent:** TalentHub (Next.js 16, React 19) — internal PT WIKA
**Tanggal:** 2026-05-07
**Kontak:** [diisi nanti]

---

## 1. Konteks

Aplikasi parent kami sudah meng-embed chatbot maldevta untuk kebutuhan **AI Talent Advisor**. Saat ini kami **tidak menggunakan iframe `<iframe src="…/embed?…">`** karena beberapa keterbatasan integrasi (rinci di bagian 3).

Sebagai workaround, kami sekarang memanggil REST API maldevta langsung dari Next.js API route lalu render UI chat custom di sisi kami:

```
POST https://maldevta.com/embed/{projectId}/conversations
POST https://maldevta.com/embed/{projectId}/conversations/{convId}/messages
```

Pendekatan ini bekerja, tetapi kami kehilangan banyak nilai produk maldevta (riwayat chat persisten, streaming, UI yang terus diperbarui maldevta, dsb.). Kami ingin **migrasi balik ke iframe embed** segera setelah maldevta menyediakan kemampuan integrasi yang dirinci di dokumen ini.

---

## 2. Use case yang ingin didukung

1. **Inject pesan dari aplikasi parent**: User klik tombol di luar iframe (misal di kartu kandidat). Aplikasi parent mengirim pesan ke chatbot iframe seolah-olah user mengetik pesan tersebut.
2. **Mendengarkan pesan user di chatbot**: User mengetik pesan di iframe (mis. *"tampilkan top 3 kandidat senior manager"*). Aplikasi parent menerima event berisi pesan user → menjalankan logika spesifik aplikasi (mis. update list kandidat di panel lain).
3. **Mendengarkan respons AI**: Aplikasi parent menerima event saat AI selesai membalas, untuk keperluan analitik atau side-effect lain.
4. **Embed aman**: Embed token bersifat ter-sign + ber-TTL, dan hanya boleh dipakai di domain yang di-whitelist.
5. **Custom theme dasar**: Warna primer/font dapat disesuaikan agar iframe blend dengan aplikasi parent.

---

## 3. Keterbatasan saat ini (yang perlu di-resolve)

### 3.1 Tidak ada API postMessage publik

Saat kami coba `iframe.contentWindow.postMessage(...)` ke iframe maldevta dengan ~9 format umum (`{type:"sendMessage", content:"..."}`, `{action:"send", message:"..."}`, dst.), tidak ada satupun yang ter-handle. Iframe diam saja.

**Akibatnya:** Use case #1 (inject pesan) **mustahil** dilakukan.

### 3.2 Tidak ada event broadcast dari iframe

Iframe tidak memancarkan event ke `window.parent` saat user kirim pesan / AI balas. Karena cross-origin policy, kami juga tidak bisa baca DOM iframe.

**Akibatnya:** Use case #2 dan #3 (listen user message / AI response) **mustahil** dilakukan.

### 3.3 Embed token = Project ID

URL embed yang kami terima: `…?projectId=prj_xxx&embedToken=prj_xxx&uid=…` — di mana `embedToken` sama persis dengan `projectId`. Ini terlihat seperti placeholder. Tidak ada signing, tidak ada TTL, tidak ada whitelist domain.

**Akibatnya:** Siapapun yang tahu project ID bisa embed iframe Anda di domain mereka.

### 3.4 Inkonsistensi auth

URL embed kadang return `401`, kadang redirect ke halaman login maldevta — tergantung sesi browser. Tidak deterministik untuk production deployment.

---

## 4. Permintaan fitur

Berikut **5 kebutuhan utama** + 2 opsional. Diurut prioritas dari yang paling kritikal.

### 4.1 [WAJIB] PostMessage API: parent → iframe

Iframe harus listen `window` event `message` dan handle perintah berikut:

#### Kirim pesan (sebagai jika user mengetik)

```javascript
// Dari aplikasi parent:
iframe.contentWindow.postMessage(
  {
    type: "maldevta:send-message",
    payload: {
      content: "Tolong analisis kandidat Budi Santoso untuk jabatan SVP",
      hideUserBubble: false   // optional, default false
    }
  },
  "https://maldevta.com"  // targetOrigin
);
```

**Behavior yang diharapkan:**
- Iframe menampilkan pesan ini sebagai bubble user (kecuali `hideUserBubble: true` → langsung tampilkan loading + balasan AI saja)
- Iframe melanjutkan flow chat normal: kirim ke AI, tampilkan balasan
- Iframe meng-emit event `user-message-sent` ke parent (lihat 4.2)

#### Reset / new conversation

```javascript
iframe.contentWindow.postMessage(
  { type: "maldevta:new-conversation" },
  "https://maldevta.com"
);
```

#### Set context / metadata

```javascript
iframe.contentWindow.postMessage(
  {
    type: "maldevta:set-context",
    payload: { selectedJabatan: "SENIOR MANAGER", currentPage: "dashboard" }
  },
  "https://maldevta.com"
);
```

Konteks ini opsional — bisa diteruskan sebagai metadata yang nanti AI bisa rujuk.

### 4.2 [WAJIB] PostMessage events: iframe → parent

Iframe meng-emit event ke `window.parent.postMessage(...)` setiap kali ada aktivitas penting:

#### `ready` (saat iframe siap menerima command)

```javascript
{
  type: "maldevta:ready",
  payload: { conversationId: "conv_xxx" }
}
```

#### `user-message-sent`

```javascript
{
  type: "maldevta:user-message-sent",
  payload: {
    conversationId: "conv_xxx",
    messageId: "msg_xxx",
    content: "tampilkan top 3 kandidat senior manager",
    timestamp: "2026-05-07T10:30:00Z"
  }
}
```

#### `ai-response`

```javascript
{
  type: "maldevta:ai-response",
  payload: {
    conversationId: "conv_xxx",
    messageId: "msg_xxx",
    content: "Berikut daftar kandidat...",
    timestamp: "2026-05-07T10:30:08Z",
    finishReason: "stop"   // "stop" | "length" | "error"
  }
}
```

#### `ai-streaming` (opsional, kalau dukung streaming)

```javascript
{
  type: "maldevta:ai-streaming",
  payload: {
    conversationId: "conv_xxx",
    messageId: "msg_xxx",
    delta: "...",     // potongan teks baru
    done: false
  }
}
```

#### `error`

```javascript
{
  type: "maldevta:error",
  payload: {
    code: "rate_limit" | "ai_unavailable" | "auth_failed" | "...",
    message: "AI sedang tidak tersedia"
  }
}
```

**Aturan:**
- Semua event WAJIB pakai prefix `maldevta:` agar parent bisa filter dengan aman
- `targetOrigin` di sisi iframe sebaiknya `*` (parent yang validate origin), atau spesifik kalau parent terdaftar di whitelist
- Parent akan listen via `window.addEventListener("message", handler)` dan validate `event.origin === "https://maldevta.com"`

### 4.3 [WAJIB] Embed token signed + domain whitelist

Saat ini `embedToken` = `projectId`. Yang dibutuhkan:

#### Generate token dari server

Endpoint server-side (dipanggil aplikasi parent dengan API key):

```
POST https://maldevta.com/api/embed-tokens
Headers: Authorization: Bearer <api_key_project>
Body: {
  "uid": "user_123",         // identifier user di sisi parent
  "ttl": 3600,                // detik
  "metadata": { ... }         // opsional
}

Response: {
  "embedToken": "eyJhbGciOi...",   // JWT-style atau opaque signed token
  "expiresAt": "2026-05-07T11:30:00Z"
}
```

Aplikasi parent generate token ini di server-side (sehingga API key tidak terekspos ke browser), lalu kasih ke browser untuk dipakai di URL embed.

#### Domain whitelist per project

Di dashboard maldevta, project owner bisa whitelist domain yang boleh embed iframe project ini. Contoh:
- `localhost:3000` (development)
- `talenthub.wika.co.id` (production)

Iframe akan check `document.referrer` atau request header `Origin`, dan return error 403 jika tidak match.

### 4.4 [SANGAT BERGUNA] Custom system prompt / instruction injection per project

Dashboard maldevta menyediakan field di project settings:

> **Custom Instructions** (selalu di-prepend ke system prompt setiap percakapan project ini)

Contoh isinya:

```
Anda adalah AI Talent Advisor untuk PT WIKA. Selalu jawab dalam bahasa Indonesia,
plain text tanpa markdown, dan ringkas.

Jika user meminta daftar/rekomendasi kandidat untuk jabatan tertentu, selain
menjawab natural, EMIT custom event lewat tag khusus:

[[MALDEVTA_INTENT: {"type":"recommendation","jabatan":"NAMA_JABATAN","limit":3}]]

Iframe akan parse tag ini dan emit ke parent sebagai event `intent-detected`.
```

Lalu iframe memparsing tag ini di response AI dan emit:

```javascript
{
  type: "maldevta:intent-detected",
  payload: { type: "recommendation", jabatan: "SENIOR MANAGER", limit: 3 }
}
```

**Why this matters:** dengan ini, fitur "user chat → panel parent auto-update" tetap satu-roundtrip (tidak perlu AI call kedua di sisi parent).

### 4.5 [WAJIB DASAR] Customization theme via URL params

```
https://maldevta.com/embed?
  projectId=...&
  embedToken=...&
  uid=...&
  primaryColor=1e3a5f&            # hex tanpa #
  fontFamily=Inter&
  borderRadius=8&
  hideHeader=true&                # sembunyikan branding maldevta
  hideFooter=true&
  initialPrompt=Halo               # pesan auto-fill di input box
```

Atau via postMessage `set-theme`:

```javascript
iframe.contentWindow.postMessage(
  {
    type: "maldevta:set-theme",
    payload: { primaryColor: "#1e3a5f", fontFamily: "Inter" }
  },
  "https://maldevta.com"
);
```

### 4.6 [OPSIONAL] Webhook server-to-server

Untuk audit trail / analytics di sisi parent, maldevta dapat POST ke endpoint kami setiap kali:
- Conversation dibuat
- User kirim pesan
- AI balas pesan

```
POST https://parent.example.com/webhooks/maldevta
Headers: X-Maldevta-Signature: <hmac-sha256 of body>
Body: {
  "event": "message.sent",
  "projectId": "prj_xxx",
  "conversationId": "conv_xxx",
  "data": { ... }
}
```

### 4.7 [OPSIONAL] JavaScript SDK wrapper

Daripada user manual handle postMessage, sediakan SDK:

```html
<script src="https://maldevta.com/embed.js"></script>
<div id="chat"></div>
<script>
  const widget = new MaldevtaWidget({
    el: "#chat",
    projectId: "prj_xxx",
    embedToken: "...",
    uid: "user_123",
    theme: { primaryColor: "#1e3a5f" },
  });

  // Ergonomic API instead of raw postMessage
  widget.sendMessage("Halo");
  widget.on("user-message-sent", (msg) => { ... });
  widget.on("ai-response", (msg) => { ... });
  widget.on("intent-detected", (intent) => { ... });
</script>
```

---

## 5. Skenario acceptance test

Saat fitur 4.1–4.5 selesai, integrasi parent harus bisa lulus skenario berikut:

### Skenario A: Inject pesan dari tombol di parent
1. User membuka aplikasi parent, iframe maldevta ter-load
2. Parent terima event `maldevta:ready`
3. User klik tombol "Tanya AI tentang kandidat ini" di kartu kandidat
4. Parent panggil `iframe.postMessage({type:"maldevta:send-message", payload:{content:"...prompt panjang..."}})`
5. **Expected:** dalam 1 detik, iframe menampilkan bubble user dengan teks tersebut, lalu menampilkan balasan AI
6. Parent terima event `user-message-sent` lalu `ai-response`

### Skenario B: Auto-update panel parent berdasarkan chat user
1. User mengetik di iframe: *"tampilkan top 3 kandidat senior manager"*
2. Parent terima event `user-message-sent` dengan content tersebut
3. (Jika 4.4 di-implement) Parent terima event `intent-detected` dengan `{jabatan:"SENIOR MANAGER", limit:3}`
4. Parent panggil API kandidat-nya sendiri → update panel di luar iframe

### Skenario C: Embed token signed + domain whitelist
1. Aplikasi parent generate `embedToken` di server pakai API key
2. Browser dapat token, render `<iframe src="...&embedToken=eyJhbG...&uid=user_123">`
3. **Expected:** iframe load normal
4. Coba embed iframe yang sama di domain yang **tidak** ter-whitelist
5. **Expected:** iframe menampilkan halaman error "Domain not authorized"

### Skenario D: Token expiry
1. Generate token dengan `ttl: 60` (1 menit)
2. Tunggu 2 menit, lalu refresh halaman
3. **Expected:** iframe emit event `error` dengan `code: "auth_failed"`, parent dapat regenerate token + reload iframe

---

## 6. Format payload (referensi cepat)

### Command (parent → iframe)

| `type` | Payload | Status |
|---|---|---|
| `maldevta:send-message` | `{ content: string, hideUserBubble?: boolean }` | WAJIB |
| `maldevta:new-conversation` | `{}` | WAJIB |
| `maldevta:set-context` | `{ [key: string]: any }` | OPSIONAL |
| `maldevta:set-theme` | `{ primaryColor?, fontFamily?, ... }` | OPSIONAL |

### Event (iframe → parent)

| `type` | Payload | Status |
|---|---|---|
| `maldevta:ready` | `{ conversationId }` | WAJIB |
| `maldevta:user-message-sent` | `{ conversationId, messageId, content, timestamp }` | WAJIB |
| `maldevta:ai-response` | `{ conversationId, messageId, content, timestamp, finishReason }` | WAJIB |
| `maldevta:ai-streaming` | `{ conversationId, messageId, delta, done }` | OPSIONAL |
| `maldevta:intent-detected` | `{ type, ...data }` | OPSIONAL (kalau 4.4 di-implement) |
| `maldevta:error` | `{ code, message }` | WAJIB |

---

## 7. Checklist permintaan kami

Mohon konfirmasi dari maldevta untuk setiap item:

- [ ] **4.1** PostMessage API parent → iframe (`send-message`, `new-conversation`)
- [ ] **4.2** PostMessage events iframe → parent (`ready`, `user-message-sent`, `ai-response`, `error`)
- [ ] **4.3** Embed token signed + domain whitelist
- [ ] **4.4** Custom system prompt / intent emission via tag (sangat membantu)
- [ ] **4.5** Customization theme via URL params atau postMessage
- [ ] **4.6** Webhook server-to-server (opsional)
- [ ] **4.7** JavaScript SDK wrapper (opsional, kalau punya bandwidth)
- [ ] **Dokumentasi resmi** untuk semua di atas, di-publish di docs.maldevta.com (atau equivalent)

---

## 8. Pertanyaan untuk maldevta

1. Apakah ada protokol postMessage internal yang sudah ada tapi belum di-dokumentasikan? (Kalau ada, kami sangat tertarik.)
2. Apakah ada timeline kapan fitur-fitur di atas bisa dirilis?
3. Apakah ada channel feedback / beta program untuk fitur embed?
4. Apakah penggunaan REST API langsung (yang kami pakai sekarang) ada limit / rate limit yang perlu kami waspadai?
5. Apakah project ID kami (`prj_a5746e6d2deb36c65aad`) bisa kontak person khusus untuk integrasi?

---

## Lampiran: Konfigurasi project kami

- **Project ID**: `prj_a5746e6d2deb36c65aad`
- **Data sources**: Excel (master karyawan), PDF (laporan asesmen)
- **Domain dev**: `http://localhost:3000`
- **Domain prod (rencana)**: TBD
- **Stack parent**: Next.js 16 + React 19 + TypeScript

Terima kasih atas perhatian dan dukungannya. Kami mengapresiasi kalau maldevta dapat memberikan timeline / response untuk pertanyaan di bagian 8 dalam waktu dekat.
