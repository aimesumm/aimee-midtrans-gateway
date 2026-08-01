
// Menu sekarang 100% berasal dari Supabase (tabel `menu_items`), dikelola
// lewat halaman Admin -> Tambah Menu. Tidak ada lagi menu bawaan/dummy di
// frontend supaya halaman utama tidak pernah menampilkan menu palsu yang
// bisa memicu error "invalid input syntax for type uuid" saat diedit/dihapus
// (menu dummy sebelumnya memakai id teks seperti "d1", bukan UUID asli).
//
// Array ini sengaja dibiarkan kosong. Kalau backend/API menu sedang tidak
// bisa diakses, halaman utama akan menampilkan grid kosong (bukan menu
// dummy) sampai koneksi ke Supabase pulih.
export const MENU_PLACEHOLDER_IMAGE = '/placeholder.png'
export const fallbackMenuItems = []
