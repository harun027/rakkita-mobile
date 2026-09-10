# Panduan Menjalankan & Build APK: Rakkita Mobile

Repository GitHub: **[https://github.com/harun027/rakkita-mobile](https://github.com/harun027/rakkita-mobile)**  
Port Server yang digunakan: **`8088`** (Bukan 8081).

---

## 1. Menghasilkan APK Development Build Agar Bisa Di-install di HP

Agar aplikasi memiliki tampilan Development Client persis seperti gambar yang Anda kirimkan:

Jalankan perintah berikut di terminal:
```bash
npx eas-cli login
npx eas-cli build --profile development --platform android
```
- Ikuti login ke akun Expo Anda (gratis).
- Tunggu EAS Cloud Build memproses APK (sekitar 5–10 menit).
- Setelah selesai, terminal akan menampilkan **Link Download APK** dan **QR Code**.
- Scan QR tersebut dengan HP Anda atau download file `.apk` langsung ke HP, lalu pasang/install.

---

## 2. Menjalankan Server Pengembangan di Laptop

Setelah APK terpasang di HP:
```bash
npm run start
```
*Server otomatis berjalan di port **`8088`** (bukan 8081).*

Jika HP dan laptop berada di jaringan Wi-Fi yang berbeda atau terkendala firewall, gunakan mode tunnel:
```bash
npm run start:tunnel
```

---

## 3. Menghubungkan HP ke Server Laptop

Buka aplikasi **Rakkita Mobile** di HP Anda:
1. Masukkan alamat URL:
   ```
   http://<IP-Laptop-Anda>:8088
   ```
   *(Contoh: `http://192.168.1.15:8088`)*
2. Tekan tombol **Connect**, atau
3. Tekan tombol **Scan QR Code** di HP Anda dan arahkan kamera ke QR Code yang muncul di terminal laptop Anda.
