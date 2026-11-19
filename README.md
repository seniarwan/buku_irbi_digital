# Buku Digital Interaktif IRBI 2026 - NON-OFFICIAL

Buka index.html langsung di Edge atau melalui XAMPP. Situs bekerja tanpa koneksi internet.

## Mengedit isi

- sumber/narasi.json memuat judul, isi bab, foto, angka ringkasan, dan matriks metodologi.
- sumber/data/ memuat tabel CSV terpisah untuk provinsi, kabupaten/kota, setiap profil provinsi, dan 11 jenis ancaman. Gunakan titik koma sebagai pemisah kolom. Kode wilayah menghubungkan baris ke peta.
- sumber/batas-kabkota.geojson memuat batas kabupaten/kota untuk lapisan peta.
- assets/foto/ memuat foto mandiri yang diambil dari objek gambar PDF. Rujukan foto ada di sumber/narasi.json.
- assets/reader.js dan assets/reader.css mengatur komponen dan tampilan. assets/content.js mengatur menu.

Setelah menyunting data atau narasi, jalankan `python build.py` dari folder proyek lalu muat ulang halaman. assets/irbi-data.js dihasilkan oleh proses ini.

## Sumber

- Nilai dan narasi: BNPB, Indeks Risiko Bencana Indonesia Tahun 2025, Volume 04, Nomor 04, Januari 2026, ISSN 2985-6922. Rujukan di situs mengikuti nomor halaman PDF.
- Geometri: batas_kabkota.geojson dan referensi kode dari proyek lokal kelas_bahaya_risiko_krb2021. Peta memakai batas tersebut dan nilai dari tabel IRBI 2025. Wilayah yang tidak memiliki nilai pada tabel ancaman diberi warna abu-abu.
- Distribusi IKD disajikan sebagai grafik. Peta status interaktif menampilkan tahun terakhir dari CSV InaRISK hingga 2025 untuk setiap kabupaten/kota.

## Ekspor buku lengkap

Pilih Ekspor PDF pada bilah situs. Pratinjau menyusun seluruh bab dan profil sesuai daftar isi. Pilih Cetak / Simpan PDF, lalu pilih Simpan sebagai PDF pada dialog Edge. Gunakan ukuran A4. Format cetak memuat seluruh baris tabel tanpa mengikuti filter yang sedang aktif di halaman web.


## Data IKD InaRISK

Peta dan tabel IKD dibangun dari sumber/IKD_InaRISK_tahun_eksisting.csv. Proses build mengambil baris tahun 2025 dengan tingkat kabupaten dan memadankan kode wilayah. Nilai dan kelas kapasitas berasal dari berkas tersebut. Angka peserta penilaian dan distribusi pada Buku IRBI 2025 tetap dicatat sesuai buku.

## Daftar Gaya

Buka Daftar Gaya dari bilah atas situs XAMPP. Gunakan pratinjau web atau contoh lembar cetak A4, lalu simpan gaya di peramban. Pratinjau satu bab memperlihatkan susunan dan margin. Dialog cetak menampilkan pemenggalan halaman hasil akhir. Pengaturan digunakan pada ekspor berikutnya di peramban ini. Untuk memindahkannya ke perangkat lain, unduh gaya JSON dan muat dari halaman yang sama.

## Foto dan penempatan

Di Daftar Gaya, pilih foto yang akan diatur, lalu unggah JPG, PNG, atau WebP bila ingin menggantinya. Foto bab dapat dipindahkan ke setelah judul atau sebelum penutup, dengan lebar, perataan, dan fokus potongan yang bisa disesuaikan. Foto web dan PDF membaca aset pengganti yang tersimpan pada peramban. Foto sampul di web tetap menjadi latar sampul, sedangkan pengaturan lebar dan perataan sampul dipakai di cetak. Berkas JSON daftar gaya memuat pengaturan gaya global, sementara pengganti foto tersimpan di penyimpanan foto peramban.

Preset Renduk Sumatera di Daftar Gaya menyiapkan palet teal, font isi Segoe UI, margin A4, dan tabel rapat. Opsi Gaya pembuka bab dapat diganti secara terpisah. Preset masuk sebagai draf dan baru diterapkan ke buku setelah disimpan.
