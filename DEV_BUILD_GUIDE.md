# Panduan Development Build (Expo Dev Client)

Tampilan pada gambar adalah **Expo Development Client (`expo-dev-client`)**. Ini adalah APK custom khusus project Anda yang memungkinkan scan QR server lokal tanpa batasan Expo Go.

---

## 1. Setup yang Telah Dikonfigurasi
1. **`package.json`**: Ditambahkan dependency `"expo-dev-client"` & script `start: "expo start --dev-client"`.
2. **`app.json`**: Ditambahkan Android package id: `"com.rakkita.laundry"`.
3. **`eas.json`**: Profil `development` siap untuk menghasilkan file **APK** internal.

---

## 2. Cara Membuat APK Development Build

Pilih salah satu dari 2 metode berikut:

### Opsi A: Menggunakan EAS Cloud Build (Direkomendasikan - Tanpa perlu install Android Studio/SDK di PC)
1. Login akun Expo (buat gratis di [expo.dev](https://expo.dev) jika belum punya):
   ```bash
   npx eas-cli login
   ```
2. Jalankan perintah build APK:
   ```bash
   npx eas-cli build --profile development --platform android
   ```
3. Tunggu proses cloud build selesai (biasanya 5–10 menit).
4. Download dan install file `.apk` langsung ke HP Android Anda (melalui link/QR yang diberikan di terminal).

---

### Opsi B: Build Lokal Langsung di PC (Jika sudah ada Android Studio & JDK)
1. Prebuild direktori native Android:
   ```bash
   npx expo prebuild
   ```
2. Jalankan build langsung ke HP / Emulator:
   ```bash
   npx expo run:android
   ```

---

## 3. Cara Menjalankan Aplikasi di HP

1. Buka terminal di project:
   ```bash
   npm run start
   # atau: npx expo start --dev-client
   ```
2. Buka aplikasi **Rakkita Laundry** di HP Android Anda (tampilan akan sama persis seperti gambar yang Anda kirimkan).
3. Di HP Anda:
   - Pilih server lokal yang otomatis muncul di daftar **Development Servers**, atau
   - Tekan **Scan QR Code** dan arahkan kamera ke QR code di terminal PC Anda, atau
   - Ketik IP komputer Anda (misal `http://192.168.1.xxx:8081`) lalu tekan **Connect**.
