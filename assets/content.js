const IRBI = {
  groups: [
    {id:'awal', label:'Bagian awal', items:[['beranda','Sampul'],['daftar-isi','Daftar Isi']]},
    {id:'pengantar', label:'Pengantar', items:[['tim-editorial','Tim Redaksi'],['ringkasan','Ringkasan Eksekutif'],['sambutan','Sambutan']]},
    {id:'dasar', label:'Pendahuluan & metodologi', items:[['pendahuluan','Pendahuluan'],['metodologi','Metodologi Pengkajian Risiko'],['analisis-data','Metodologi Analisis Data'],['klasifikasi','Analisis & Klasifikasi Risiko'],['transisi-reformulasi','Transisi Reformulasi IRBI'],['metodologi-reformulasi','Metodologi Reformulasi']]},
    {id:'nasional', label:'Hasil IRBI', items:[['hasil-nasional','Hasil Analisis Data'],['tabel-provinsi','Indeks Provinsi'],['tabel-kabupaten','Indeks Kabupaten/Kota']]},
    {id:'wilayah', label:'Profil 38 provinsi', items:[]},
    {id:'ancaman', label:'11 jenis ancaman', items:[]},
    {id:'akhir', label:'Referensi & lampiran', items:[['pustaka','Daftar Pustaka'],['pelengkap-akhir','Pembuka Bagian Ancaman'],['sampul-belakang','Sampul Belakang'],['metadata','Metadata & Riwayat Versi']]}
  ],
  provinces: [
    'Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Kepulauan Bangka Belitung','Kepulauan Riau','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta','Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku','Maluku Utara','Papua Barat','Papua','Papua Tengah','Papua Selatan','Papua Pegunungan','Papua Barat Daya'
  ],
  hazards: [
    'Banjir','Gempabumi','Tsunami','Letusan Gunung Api','Banjir Bandang','Gelombang Ekstrem dan Abrasi','Kebakaran Hutan dan Lahan','Tanah Longsor','Kekeringan','Likuefaksi','Cuaca Ekstrem'
  ],
  pages: IRBI_DATA.pages
};
function irbiSlug(text) { return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
IRBI.provinces.forEach(name => { IRBI.groups.find(group => group.id === 'wilayah').items.push(['provinsi-' + irbiSlug(name), name]); });
IRBI.hazards.forEach(name => { IRBI.groups.find(group => group.id === 'ancaman').items.push(['ancaman-' + irbiSlug(name), name]); });


IRBI.toc2025 = [
  {label:null,items:[
    ['ringkasan','Ringkasan Eksekutif','8–9'],
    ['sambutan','Sambutan Kepala BNPB','12–13']
  ]},
  {label:'Pendahuluan',items:[
    ['pendahuluan','Latar Belakang','14–15'],
    ['pendahuluan','Ruang Lingkup','16–17'],
    ['pendahuluan','Tujuan','16–17']
  ]},
  {label:'Metodologi',items:[
    ['metodologi','Metodologi Pengkajian Risiko','17–19'],
    ['analisis-data','Metodologi Analisis Data','20–23'],
    ['klasifikasi','Metodologi Analisis Tingkat Risiko Bencana Kabupaten/Kota','24–31'],
    ['transisi-reformulasi','Transisi Reformulasi IRBI',''],
    ['metodologi-reformulasi','Metodologi Reformulasi','']
  ]},
  {label:'Analisis Data',items:[
    ['tabel-provinsi','Tabel Indeks Risiko Bencana Provinsi','34–39'],
    ['tabel-kabupaten','Tabel Indeks Risiko Bencana Kabupaten/Kota','40–57']
  ]},
  {label:'Indeks Risiko Bencana 2025',pages:'58–209',items:IRBI.provinces.map((name,index)=>
    ['provinsi-'+irbiSlug(name),(index===0 ? 'Pemerintah ' : 'Provinsi ')+name,String(58+index*4)])},
  {label:'Tabel dan Peta Indeks Risiko Per Ancaman',pages:'212–375',items:IRBI.hazards.map((name,index)=>
    ['ancaman-'+irbiSlug(name),name,String([212,230,248,260,266,282,294,310,326,344,358][index])])},
  {label:'Daftar Pustaka',pages:'376–379',route:'pustaka',items:[]}
];
