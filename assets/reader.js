(function () {
  'use strict';

  const escape = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const classes = ['TINGGI', 'SEDANG', 'RENDAH'];
  function chapterTitle(title) {
    if (title.trim() === 'Sambutan Kepala BNPB') {
      return 'Sambutan<br><span class="chapter-title-accent">Kepala BNPB</span>';
    }
    const [first,...rest] = title.trim().split(/\s+/);
    return escape(first)+(rest.length ? ' <span class="chapter-title-accent">'+escape(rest.join(' '))+'</span>' : '');
  }
  const colors = {TINGGI: '#ef271b', SEDANG: '#ffff76', RENDAH: '#93cb63', 'Tanpa nilai': '#d5d7d5'};
  const capacityColors = {TINGGI:'#368454',SEDANG:'#f1cb5f',RENDAH:'#cd514c','Tanpa nilai':'#d5d7d5'};
  const statusColors = {'2025':'#37854c','2024':'#add570','2023':'#2a60a1','2022':'#26c2cc',
    '2021':'#aa51a7','2020':'#f4ae47','2019':'#c97848','Tanpa catatan':'#d5d7d5'};
  const ikdNumber = new Intl.NumberFormat('id-ID',{minimumFractionDigits:4,maximumFractionDigits:4});
  const number = value => Number(value.replace(',', '.'));
  const risk = value => value > 176 ? 'TINGGI' : value < 14.67 ? 'RENDAH' : 'SEDANG';
  const regionName = row => row[1];
  const sourceCounties = IRBI_DATA.tables['indeks-kabupaten-kota'].rows;
  const countyByCode = new Map(sourceCounties.map(row => [row.at(-1), row]));
  const stats = (label, value) => '<div><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>';

  function dataset(page) {
    if (!page.dataset) return null;
    const table = IRBI_DATA.tables[page.dataset];
    const provinces = page.dataset === 'indeks-provinsi';
    const rows = page.kode ? table.rows.filter(row => row.at(-1).startsWith(page.kode)) : table.rows;
    const items = rows.map(row => {
      const score = row[3];
      return {code: row.at(-1), name: regionName(row), score, risk: provinces ? risk(number(score)) : row[4]};
    });
    return {header: table.header, rows, items, provinces, ikd: page.ikd?.snapshot, name: page.dataset};
  }

  function reformulationInline(text) {
    return escape(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/\b(x|y|I|A|R|H|V|vf)_(min|max|[PLUAM1234])\b/g,'<var>$1<sub>$2</sub></var>');
  }
  function reformulationBlocks(blocks=[]) {
    const sub=(x,s)=>'<msub><mi>'+x+'</mi><mi>'+s+'</mi></msub>';
    const frac=(a,b)=>'<mfrac><mrow>'+a+'</mrow><mrow>'+b+'</mrow></mfrac>';
    const par=x=>'<mrow><mo>(</mo>'+x+'<mo>)</mo></mrow>';
    const AL=sub('A','L'), AU=sub('A','U'), XL=sub('x','L'), XU=sub('x','U');
    const formulas={
      fuzzy:'<mi>I</mi>'+par('<mi>x</mi>')+'<mo>=</mo>'+frac('<mn>1</mn>','<mn>1</mn><mo>+</mo><msup><mrow>'+par(frac('<mi>x</mi>','<mi>m</mi>'))+'</mrow><mrow><mo>−</mo><mi>s</mi></mrow></msup>'),
      spread:'<mi>s</mi><mo>=</mo>'+frac('<mi mathvariant="normal">ln</mi>'+par(frac(AL,AU)),'<mi mathvariant="normal">ln</mi>'+par(frac(XU,XL))),
      midpoint:'<mi>m</mi><mo>=</mo>'+XL+'<mo>·</mo><msup>'+AL+frac('<mn>1</mn>','<mi>s</mi>')+'</msup><mo>,</mo><mtext> atau </mtext><mi>m</mi><mo>=</mo>'+XU+'<mo>·</mo><msup>'+AU+frac('<mn>1</mn>','<mi>s</mi>')+'</msup>',
      multi:sub('I','multi')+'<mo>=</mo><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover>'+sub('I','i'),
      vulnerability:sub('V','i')+'<mo>=</mo><mi>w</mi><mo>·</mo>'+sub('vf','1')+'<mo>+</mo><mi>w</mi><mo>·</mo>'+sub('vf','2')+'<mo>+</mo><mo>…</mo><mo>+</mo><mi>w</mi><mo>·</mo>'+sub('vf','n'),
      potential:sub('R','P')+'<mo>=</mo><msqrt><mrow>'+sub('H','M')+'<mo>×</mo>'+sub('V','M')+'</mrow></msqrt><mtext> atau </mtext>'+sub('R','P')+'<mo>=</mo><msup>'+par(sub('H','M')+'<mo>×</mo>'+sub('V','M'))+frac('<mn>1</mn>','<mn>2</mn>')+'</msup>',
      capacity:'<mi>C</mi><mo>=</mo><mrow><mo>{</mo><mtable columnalign="left left" rowspacing=".5em"><mtr><mtd>'+frac(frac('<mn>1</mn>','<mn>3</mn>'),'<mn>0.4</mn>')+'<mo>·</mo><mi>IKD</mi></mtd><mtd><mtext>jika </mtext><mi>IKD</mi><mo>≤</mo><mn>0.4</mn></mtd></mtr><mtr><mtd>'+frac('<mn>1</mn>','<mn>3</mn>')+'<mo>+</mo>'+frac(frac('<mn>1</mn>','<mn>3</mn>'),'<mn>0.4</mn>')+'<mo>·</mo>'+par('<mi>IKD</mi><mo>−</mo><mn>0.4</mn>')+'</mtd><mtd><mtext>jika </mtext><mn>0.4</mn><mo>&lt;</mo><mi>IKD</mi><mo>≤</mo><mn>0.8</mn></mtd></mtr><mtr><mtd>'+frac('<mn>2</mn>','<mn>3</mn>')+'<mo>+</mo>'+frac(frac('<mn>1</mn>','<mn>3</mn>'),'<mn>0.2</mn>')+'<mo>·</mo>'+par('<mi>IKD</mi><mo>−</mo><mn>0.8</mn>')+'</mtd><mtd><mtext>jika </mtext><mn>0.8</mn><mo>&lt;</mo><mi>IKD</mi><mo>≤</mo><mn>1</mn></mtd></mtr></mtable></mrow>',
      actual:sub('R','A')+'<mo>=</mo><msqrt><mrow>'+sub('R','P')+'<mo>×</mo>'+par('<mn>1</mn><mo>−</mo><mi>C</mi>')+'</mrow></msqrt><mtext> atau </mtext>'+sub('R','A')+'<mo>=</mo><msup>'+par(sub('R','P')+'<mo>×</mo>'+par('<mn>1</mn><mo>−</mo><mi>C</mi>'))+frac('<mn>1</mn>','<mn>2</mn>')+'</msup>',
      smoothing:sub('IRBI','t1')+'<mo>=</mo>'+sub('R','t0')+'<mo>−</mo>'+par(par(sub('R','t0')+'<mo>−</mo>'+sub('R','t1'))+'<mo>×</mo><mn>30</mn><mo>%</mo>'),
      ratio:'<mi>RR</mi><mo>=</mo><msub><mi mathvariant="normal">log</mi><mn>2</mn></msub>'+par(frac(sub('R','P'),'<mi>C</mi>'))+'<mo>+</mo><mn>1</mn>',
      harmonization:'<mi>f</mi>'+par('<mi>x</mi>')+'<mo>=</mo>'+sub('y','min')+'<mo>+</mo>'+par('<mi>x</mi><mo>−</mo>'+sub('x','min'))+par(frac(sub('y','max')+'<mo>−</mo>'+sub('y','min'),sub('x','max')+'<mo>−</mo>'+sub('x','min')))
    };
    return blocks.map(block=>{
      if(block.type==='equation') return '<figure class="reformulation-equation"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>'+formulas[block.key]+'</mrow></math>'+(block.number ? '<figcaption>(Persamaan '+escape(block.number)+')</figcaption>' : '')+'</figure>';
      if(block.type==='table') return '<figure class="reformulation-table"><figcaption>'+reformulationInline(block.title)+'</figcaption><div class="table-scroll"><table><thead><tr>'+block.headers.map(h=>'<th scope="col">'+reformulationInline(h)+'</th>').join('')+'</tr></thead><tbody>'+block.rows.map(row=>'<tr>'+row.map(c=>'<td>'+reformulationInline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="book-note">'+reformulationInline(block.note)+'</p></figure>';
      return '<p>'+reformulationInline(block.text)+'</p>';
    }).join('');
  }
  function narrative(page) {
    const paragraphs = texts => texts.map(text => {
      if (/^Assalamu/i.test(text)) return '<p class="book-greeting"><strong><em>'+escape(text)+'</em></strong></p>';
      if (/^Wassalamu/i.test(text)) return '<p class="book-greeting"><strong>'+escape(text)+'</strong></p>';
      return '<p>'+escape(text)+'</p>';
    }).join('');
    const headingKey = text => text.trim().replace(/\s+/g,' ').toLocaleLowerCase('id');
    return page.bagian.map((part,index) => {
      if (part.subbagian) return '<section class="book-card"><h2 id="bagian-'+index+'">'+escape(part.judul)+'</h2>'+
        paragraphs(part.paragraf)+
        part.subbagian.map(sub=>{
          let title=escape(sub.judul);
          for(const term of sub.istilahMiring || []) title=title.replace(escape(term),'<em>'+escape(term)+'</em>');
          return '<details class="method-table"><summary>'+title+'</summary>'+(sub.blocks ? '<div class="reformulation-content">'+reformulationBlocks(sub.blocks)+'</div>' : '<div class="reformulation-template-space" aria-label="Ruang isi '+escape(sub.judul)+'"></div>')+'</details>';
        }).join('')+'</section>';
      if(part.blocks) return '<section class="book-card reformulation-content"><h2 id="bagian-'+index+'">'+escape(part.judul)+'</h2>'+reformulationBlocks(part.blocks)+'</section>';
      const listTag=part.jenisDaftar==='bullet' ? 'ul' : 'ol';
      const list = part.daftar ? '<'+listTag+' class="book-components">'+
        part.daftar.map(text => '<li>'+escape(text)+'</li>').join('')+'</'+listTag+'>' : '';
      const heading = headingKey(part.judul) === headingKey(page.title) ? '' :
        '<h2 id="bagian-'+index+'">'+escape(part.judul)+'</h2>';
      return '<section class="book-text'+(part.bobot ? ' has-weight-chart' : '')+'">'+heading+
        paragraphs(part.paragraf)+list+(part.rumus ? riskFormula(part.rumus) : '')+(part.bobot ? hazardWeights(part.bobot) : '')+paragraphs(part.setelahDaftar || [])+photo(part)+(page.template ? '<div class="reformulation-template-space" aria-label="Ruang isi '+escape(part.judul)+'"></div>' : '')+'</section>';
    }).join('');
  }

  function classChart(ikd = false) {
    return '<section class="book-card"><h2 id="distribusi">'+(ikd ? 'Distribusi kelas kapasitas dalam CSV' : 'Distribusi kelas risiko')+'</h2><div data-chart class="risk-chart"></div></section>';
  }

  function regionMap(title, data, regional = false) {
    const palette = data.status ? data.palette : data.ikd ? capacityColors : colors;
    let mapTitle = 'PETA INDEKS RISIKO BENCANA KABUPATEN/KOTA';
    if (data.status) mapTitle = 'Peta Sebaran Status Kab/Kota Penilaian IKD';
    else if (data.ikd) mapTitle = 'Peta IKD Kabupaten/Kota';
    else if (regional) mapTitle = 'PETA INDEKS RISIKO BENCANA DI PROVINSI '+title.toLocaleUpperCase('id');
    else if (data.provinces) mapTitle = 'PETA INDEKS RISIKO BENCANA PROVINSI';
    else if (data.name?.startsWith('ancaman-')) mapTitle =
      'PETA INDEKS RISIKO BENCANA '+IRBI_DATA.pages[data.name].title.toLocaleUpperCase('id');
    const subtitle = data.ikd ? title+' · Tahun 2025' : 'Diperbarui Tahun 2025';
    const provinceMapName = title.toLocaleUpperCase('id').replace(/\bKEPULAUAN\b/g,'KEP.');
    const mapHeading = regional && !data.ikd
      ? 'PETA INDEKS RISIKO BENCANA<br>DI PROVINSI '+escape(provinceMapName)
      : escape(mapTitle);
    return '<section class="book-card atlas-card"'+(data.status ? ' data-ikd-status' : '')+'><header class="atlas-heading">'+
      '<div><h2 id="'+(data.status ? 'peta-status-ikd' : 'peta')+'">'+mapHeading+'</h2><p class="map-subtitle">'+escape(subtitle)+'</p></div>'+
      '<div class="atlas-credit"><img src="assets/lambang/identitas-bnpb-peta.png" alt="Badan Nasional Penanggulangan Bencana (BNPB), Graha BNPB, Jl. Pramuka Kav. 38 Jakarta Timur 13120. Telepon (021) 298 27793, faks (021) 2128 1200. Email contact@bnpb.go.id."></div></header>'+
      (data.status ? '<div class="map-actions"><label>Tahun penilaian terakhir <select data-status-year><option value="">Semua tahun</option>'+
        Object.keys(palette).map(label=>'<option>'+escape(label)+'</option>').join('')+'</select></label></div>' : '')+
      '<div class="atlas-frame '+(regional ? 'atlas-regional' : 'atlas-national')+'">'+
      '<div class="atlas-plot"><canvas class="risk-map" data-map width="1200" height="760" aria-label="Peta kelas '+(data.status ? 'status penilaian IKD. Gunakan daftar kabupaten/kota untuk memilih dengan keyboard.' : (data.ikd ? 'kapasitas IKD' : 'risiko IRBI')+'. Gunakan tombol nama wilayah pada tabel untuk memilih dengan keyboard.')+'"></canvas>'+
      '<div class="atlas-axis atlas-axis-east" data-axis-lat aria-hidden="true"></div><div class="atlas-axis atlas-axis-south" data-axis-lon aria-hidden="true"></div></div>'+
      '<div class="map-orientation atlas-box"><div class="atlas-compass"><img src="assets/lambang/arah%20utara%20peta.png" alt="Arah utara"></div>'+
      '<div class="map-scale" data-map-scale></div></div>'+
      '<div class="map-key atlas-box"><strong>Legenda</strong><div class="map-legend">'+
      '<span><i class="atlas-province-boundary"></i>Batas provinsi</span>'+
      (!data.provinces ? '<span><i class="atlas-boundary"></i>Batas kabupaten/kota</span>' : '')+
      '<span><i class="atlas-capital-dot"></i>Ibukota provinsi</span>'+
      Object.entries(palette).filter(([label])=>label !== 'Tanpa nilai').map(([label,color]) =>
        '<span><i style="background:'+color+'"></i>'+(data.status ? escape(label)+' ('+data.counts[label]+')' : classes.includes(label) ? label : label.toLocaleLowerCase('id'))+'</span>'
      ).join('')+'</div></div><div class="map-locator atlas-box"><strong>Inset Indonesia</strong>'+
      '<canvas data-map-inset width="196" height="90" aria-label="Peta indeks lokasi tampilan"></canvas></div>'+
      '<div class="map-source atlas-box">'+
      (data.ikd ? '<strong>Data dan parameter</strong><span>'+
        (data.status ? 'Tahun penilaian terakhir dalam CSV InaRISK' : 'IKD 2025 · CSV InaRISK')+
        '</span><span>Batas administrasi · lihat metadata</span>' :
        '<div class="map-parameters"><p>Parameter yang digunakan dalam penyusunan Indeks Risiko Bencana Tahun 2025</p>'+
        '<ol><li>Indeks Bahaya BNPB 2021</li><li>Hasil Proyeksi IRBI 2025–2045'+
        '<ol type="a"><li>Indeks Jiwa Terpapar Proyeksi 2025</li><li>Indeks Kerugian Proyeksi 2025</li>'+
        '<li>Indeks Kerusakan Lingkungan Proyeksi 2025</li></ol></li>'+
        '<li>Indeks Kapasitas Daerah 2025</li><li>Peta Dasar, BIG</li>'+
        '<li>Batas Administrasi BIG Tahun 2025</li></ol></div>')+
      '<span class="map-relief-credit">Relief GEBCO_2026 · WGS 84 · <a href="https://doi.org/10.5285/4f68d5c7-45eb-f999-e063-7086abc036fa" target="_blank" rel="noopener">GEBCO Compilation Group (2026)</a></span></div></div>'+
      '<div class="map-reading"><p class="map-status" data-map-status aria-live="polite"></p>'+
      '</div></section>';
  }

  function results(data, includeOverview = true) {
    if (!data) return '';
    if (data.ikd) return includeOverview ? regionMap('Kelas kapasitas',data) : '';
    return (includeOverview ? regionMap(data.ikd ? 'Kelas kapasitas' : data.provinces ? "Tingkat provinsi" : data.name === "indeks-kabupaten-kota" ? "Kabupaten/kota · Multibahaya" : IRBI.pages[data.name].title,data)+classChart(data.ikd) : '')+
      '<section class="book-card"><h2 id="tabel-web">'+(data.ikd ? 'Tabel nilai IKD 2025' : 'Tabel indeks risiko')+'</h2>'+
      '<div class="data-toolbar"><label>Cari wilayah <input type="search" data-irbi-filter></label>'+
      '<label>Kelas <select data-risk-filter><option value="">Semua kelas</option>'+
      classes.map(label => '<option>'+label+'</option>').join('')+'</select></label>'+
      '<button type="button" data-download>Unduh CSV</button></div>'+
      '<p class="book-note" data-table-count aria-live="polite"></p>'+
      '<div class="table-scroll" tabindex="0" aria-label="Tabel wilayah"><table><thead><tr>'+
      tableColumns(data).map(index =>
        '<th scope="col"><button type="button" data-sort="'+index+'">'+escape(data.header[index])+'</button></th>'
      ).join('')+'</tr></thead><tbody></tbody></table></div></section>';
  }

  function ikdStatusData(snapshot) {
    const counts = {};
    const items = sourceCounties.map(row => {
      const code = row.at(-1);
      const year = snapshot.status.terakhir[code];
      const status = year ? String(year) : 'Tanpa catatan';
      counts[status] = (counts[status] || 0)+1;
      return {code,name:row[1],score:year ? String(year) : '',risk:status};
    });
    const palette = Object.fromEntries(Object.entries(statusColors).filter(([label]) => counts[label]));
    return {items,counts,palette,status:true,ikd:snapshot};
  }

  function ikdStatusMap(snapshot) {
    const data = ikdStatusData(snapshot);
    const unmatched = snapshot.status.tanpaPadanan;
    const note = unmatched.length ? ' Kode CSV '+unmatched.map(escape).join(', ')+
      ' belum memiliki padanan pada batas administrasi yang dipakai.' : '';
    return regionMap('Penilaian terakhir tercatat hingga 2025',data)+
      '<p class="book-note">Setiap wilayah diwarnai menurut tahun penilaian terakhir dalam CSV, hingga 2025. Warna abu-abu berarti tidak ada catatan yang cocok untuk wilayah tersebut dalam berkas ini.'+
      note+'</p>';
  }

  function home(page, data) {
    const metrics = page.metrik;
    const overview = '<div class="data-lead"><p>INDONESIA · IRBI 2025</p>'+
      '<div class="data-lead-main"><strong>'+escape(metrics.aktual)+'</strong><span>Indeks risiko bencana nasional</span></div>'+
      '<div class="data-lead-context">'+stats('Provinsi',data.rows.length)+stats('Kabupaten/kota',sourceCounties.length)+
      stats('Jenis ancaman',IRBI.hazards.length)+'</div></div>';
    return '<div class="book-front"><figure class="book-cover-artwork">'+
      '<img data-book-photo="sampul.jpg" data-cover-original="assets/foto/sampul-lengkap.png" src="assets/foto/sampul-lengkap.png" alt="Sampul Indeks Risiko Bencana Indonesia 2026">'+
      '</figure>'+overview+'</div>';

  }

  const numberText = new Intl.NumberFormat('id-ID', {maximumFractionDigits: 2});
  function trend(page) {
    const metrics = page.metrik;
    if (!metrics) return '';
    const comparable = metrics.tren.map(({tahun,nilai}) => ({label:tahun, value:number(nilai)}));
    const baseline = metrics.baseline;
    return '<section class="book-card"><h2 id="tren">Perbandingan tahunan</h2>'+
      '<p>Bahaya dan kerentanan menggunakan baseline 2021, dengan kapasitas dari penilaian IKD tiap tahun.</p>'+
      comparable.map(({label,value}) =>
        '<div class="chart-row"><span>'+escape(label)+'</span><meter min="0" max="300" value="'+value+'"></meter><strong>'+numberText.format(value)+'</strong></div>'
      ).join('')+
      '<p class="book-note">Skala indeks 0–300 untuk grafik ini. Angka aktual 2025 '+escape(metrics.aktual)+
      ' dan baseline target RPJMN '+escape(baseline)+' menggunakan basis data yang dijelaskan pada bab ini.</p></section>';
  }

  function photo(page, extraClass = '') {
    if (!page.foto) return '';
    const {nama,keterangan,halaman,sumber} = page.foto;
    const caption = extraClass === 'bnpb-portrait' ? escape(keterangan) :
      escape(sumber || 'BNPB')+' · '+escape(keterangan)+(halaman ? ' · halaman '+escape(halaman) : '');
    return '<figure class="book-photo '+extraClass+'" data-book-photo="'+escape(nama)+'"><img src="assets/foto/'+escape(nama)+
      '" alt="'+escape(keterangan)+'" loading="lazy"><figcaption>'+caption+'</figcaption></figure>';
  }

  function referenceTable({judul,halaman,kolom,baris,catatan}) {
    const key = String(halaman).replace('–','-');
    return '<details class="method-table"><summary>'+escape(judul)+'</summary>'+
      '<p class="book-note">Sumber BNPB · halaman '+escape(halaman)+'</p>'+
      '<div class="table-scroll"><table aria-label="'+escape(judul)+'"><thead><tr>'+
      kolom.map(title => '<th scope="col">'+escape(title)+'</th>').join('')+'</tr></thead><tbody>'+
      baris.map(row => '<tr>'+row.map(value => '<td>'+escape(value)+'</td>').join('')+'</tr>').join('')+
      '</tbody></table></div>'+(catatan ? '<p class="book-note">'+escape(catatan)+'</p>' : '')+'<button type="button" data-method-csv="'+key+'" data-method-title="'+escape(judul)+'">Unduh CSV</button></details>';
  }

  function riskFormula(symbols) {
    const [r,h,v,c] = symbols.map(escape);
    return '<figure class="method-equation">'+
      '<div class="math-formula" aria-label="Risiko mendekati bahaya dikalikan kerentanan dibagi kapasitas">'+
      '<span>Risiko ('+r+') ≈ Bahaya ('+h+') ×</span> <span class="method-fraction"><span>Kerentanan ('+v+')</span><span>Kapasitas ('+c+')</span></span></div></figure>';
  }

  function methodFigure(file, description, source) {
    return '<figure class="method-source-figure"><img src="assets/foto/'+escape(file)+
      '" alt="'+escape(description)+'" loading="lazy"><figcaption>'+escape(source)+'</figcaption></figure>';
  }

  function assessmentFlow({judul,sumber,masukan,keluaran,gambar}) {
    return '<section class="book-card method-flow"><h2 id="alur-pengkajian">'+escape(judul)+'</h2>'+
      methodFigure(gambar,'Diagram alur dari peta bahaya, kerentanan, dan kapasitas ke peta risiko bencana serta dokumen dan peta KRB.',sumber)+
      '<details class="method-transcript"><summary>Baca isi diagram</summary>'+
      '<div class="method-flow-grid">'+masukan.map(({judul,butir}) =>
        '<section><h3>'+escape(judul)+'</h3><ul>'+butir.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul></section>'
      ).join('')+'</div><div class="method-flow-result">'+keluaran.map(item=>'<strong>'+escape(item)+'</strong>').join(' → ')+
      '</div></details></section>';
  }

  function hazardWeights() {
    return '<figure class="method-weights method-source-figure">'+
      '<img src="assets/foto/diagram-pembobotan-bahaya.png?v=berkas-proyek" alt="Diagram pembobotan jenis bahaya menurut frekuensi kejadian dan peringatan dini" loading="lazy">'+
      '<figcaption>Pembobotan jenis bahaya · BNPB</figcaption></figure>';
  }

  function components(page) {
    const out = [];
    if (page.alur) out.push(assessmentFlow(page.alur));
    if (page.ikd) {
      const {partisipasi,kelas,kutipan,snapshot} = page.ikd;
      out.push('<section class="book-card"><h2 id="ikd">Penilaian Indeks Ketahanan Daerah</h2>'+
        '<div class="book-stats">'+stats('Kabupaten/kota yang menilai IKD 2024',partisipasi['2024'])+
        stats('Kabupaten/kota yang menilai IKD 2025',partisipasi['2025'])+'</div>'+
        '<h3>Distribusi kelas IKD yang ditampilkan dalam buku</h3>'+
        kelas.map(({label,jumlah,persen}) => '<div class="chart-row"><span>'+escape(label)+
          '</span><meter min="0" max="100" value="'+Number(persen)+'"></meter><strong>'+
          escape(jumlah)+' · '+new Intl.NumberFormat('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}).format(persen)+'%</strong></div>').join('')+
        '<blockquote class="method-quote">'+escape(kutipan)+'</blockquote><p class="book-note">Buku mencatat 469 daerah yang melakukan penilaian pada 2025. Angka distribusi kelas di atas disajikan sebagaimana tercantum pada halaman 23, dengan jumlah kelas yang berbeda dari jumlah peserta.</p></section>'+ikdStatusMap(snapshot));
    }
    if (page.matriks) {
      out.push('<section class="book-card"><h2 id="matriks">Matriks klasifikasi dan pembobotan</h2>'+
        page.matriks.map(referenceTable).join('')+'</section>');
    }
    return out.join('');
  }

  function provinceSpread(id, page, data, province, threats) {
    const classification = risk(number(province[3])).toLocaleLowerCase('id');
    return '<div class="report-spread province-spread">'+
      '<div class="report-masthead"><span>ATLAS RISIKO BENCANA</span><span>INDONESIA / 2025</span></div>'+
      '<div class="report-opening"><header class="chapter-title province-title">'+
      '<div class="report-identity"><img class="province-logo" src="assets/lambang/'+escape(id)+'.png" alt="Lambang '+escape(page.title)+'">'+
      '<div><h1>'+chapterTitle(page.title)+'</h1>'+
      '<p class="report-count"><strong>'+data.rows.length+'</strong> kabupaten/kota</p></div></div>'+
      '<div class="report-score"><span class="profile-risk-label">INDEKS RISIKO</span><strong>'+escape(province[3])+'</strong>'+
      '<span class="report-risk report-risk-'+classification+'">'+classification.toLocaleUpperCase('id')+'</span></div></header>'+
      '</div><div class="profile-data-lead"></div><div class="report-map">'+regionMap(page.title,data,true)+'</div>'+
      '<div class="report-body"><div class="report-copy">'+narrative(page)+'</div>'+
      '<aside class="report-margin" aria-label="Ringkasan profil">'+classChart()+threats+'</aside></div>'+
      results(data,false)+
      '<footer class="report-credit"><span>'+escape(page.summary)+'</span><span>INDEKS RISIKO BENCANA INDONESIA</span></footer></div>';
  }

  function chapterSpread(id, page, data, print) {
    const homePage = id === 'beranda';
    const title = homePage && print ? 'Ikhtisar nasional' : page.title;
    const intro = '<header class="chapter-title"><h1>'+
      chapterTitle(title)+'</h1></header>';
    const atlas = '<div class="report-masthead"><span>ATLAS RISIKO BENCANA</span><span>INDONESIA / 2025</span></div>';
    const opening = homePage && !print ? home(page,data) : intro;
    const copy = '<div class="report-copy">'+narrative(page)+'</div>';
    const trends = id === 'hasil-nasional' || id === 'ringkasan' ? trend(page) : '';
    const portrait = id === 'sambutan';
    return '<div class="report-spread chapter-spread">'+atlas+opening+(portrait ? photo(page,'bnpb-portrait') : '')+copy+components(page)+
      trends+(homePage ? '' : results(data))+(homePage || portrait ? '' : photo(page))+
      '<footer class="report-credit"><span>'+escape(page.summary)+'</span><span>INDEKS RISIKO BENCANA INDONESIA</span></footer></div>';
  }

  function editorialSpread(page) {
    const credits = page.redaksi;
    const list = (names,start=1) => '<ol start="'+start+'">'+
      names.map(name => '<li>'+escape(name)+'</li>').join('')+'</ol>';
    const role = (title,details,style='') => '<section'+(style ? ' class="'+style+'"' : '')+'><h2>'+title+'</h2>'+details+'</section>';
    const person = ({nama,jabatan}) => '<p><strong>'+escape(nama)+'</strong><br>'+escape(jabatan)+'</p>';
    return '<div class="editorial-sheet">'+
      '<div class="editorial-content"><header class="chapter-title editorial-title"><h1>Tim <span class="chapter-title-accent">Redaksi</span></h1></header>'+
      '<div class="editorial-columns"><div class="editorial-roles">'+
      role('Pengarah',person(credits.pengarah))+
      role('Penanggung Jawab',person(credits.penanggungJawab))+
      role('Editor',list(credits.editor))+
      role('Desain dan Tata Letak',list(credits.desain))+
      role('Atribusi Foto','<p>'+escape(credits.atribusiFoto)+'</p>')+
      (credits.kontributor ? role('Kontributor',list(credits.kontributor)) : '')+
      (credits.penerbit ? role('Diterbitkan Oleh','<p><strong>'+escape(credits.penerbit)+'</strong></p>'+
        (credits.keteranganPenerbit || []).map(text=>'<p>'+escape(text)+'</p>').join('')) : '')+
      role('Penulis',list(credits.penulis.slice(0,6)),'editorial-authors-start')+
      '</div><div class="editorial-authors" role="group" aria-label="Daftar penulis dilanjutkan">'+
      list(credits.penulis.slice(6),7)+'</div>'+role('Penulis',list(credits.penulis),'editorial-roster')+'</div></div></div>';
  }

  function content(id, page, {print = false} = {}) {
    if (id==='sampul-belakang') return '<section class="cover-artwork back-cover-artwork"><img data-book-photo="sampul_belakang.png" data-cover-original="assets/foto/sampul_belakang.png" src="assets/foto/sampul_belakang.png" alt="Sampul belakang Buku Digital IRBI"></section>';
    if (page.redaksi) return editorialSpread(page);
    const data = dataset(page);
    const province = page.kode && IRBI_DATA.tables['indeks-provinsi'].rows.find(row => row.at(-1) === page.kode);
    const threats = page.ancaman?.length
      ? '<section><h2 id="ancaman">Ancaman bencana</h2><ul class="hazard-tags">'+page.ancaman.map(name => {
        const aliases = {'Gempa Bumi':'Gempabumi','Cuaca Ekstrim':'Cuaca Ekstrem','Gelombang Ekstrim dan Abrasi':'Gelombang Ekstrem dan Abrasi'};
        const route = 'ancaman-'+irbiSlug(aliases[name] || name);
        return '<li>'+(IRBI.pages[route] ? '<a href="#/'+route+'">'+escape(name)+'</a>' : escape(name))+'</li>';
      }).join('')+'</ul></section>' : '';
    if (province && data) return provinceSpread(id,page,data,province,threats);
    return chapterSpread(id,page,data,print);
  }

  function download(rows, header, name) {
    const quote = value => '"'+String(value).replaceAll('"','""')+'"';
    const csv = [header, ...rows].map(row => row.map(quote).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = name+'.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function tableColumns(data) {
    return data.header.map((name,index)=>index).filter(index=>
      index < data.header.length-1 && data.header[index].trim().toLocaleLowerCase('id') !== 'halaman pdf');
  }

  function bindTable(root, data) {
    const tbody = root.querySelector('.table-scroll tbody');
    const search = root.querySelector('[data-irbi-filter]');
    const classFilter = root.querySelector('[data-risk-filter]');
    const count = root.querySelector('[data-table-count]');
    let sortColumn = 0;
    let direction = 1;
    let visible = [];
    function paint() {
      const query = search.value.trim().toLocaleLowerCase('id');
      visible = data.rows.map((row,index) => ({row,item:data.items[index]}))
        .filter(({row,item}) => (!classFilter.value || item.risk === classFilter.value) &&
          tableColumns(data).map(index=>row[index]).join(' ').toLocaleLowerCase('id').includes(query));
      const numeric = data.provinces ? [0,2,3,4] : [0,3,5];
      visible.sort(({row:a},{row:b}) => direction * (numeric.includes(sortColumn)
        ? number(a[sortColumn])-number(b[sortColumn])
        : a[sortColumn].localeCompare(b[sortColumn],'id')));
      count.textContent = visible.length+' dari '+data.rows.length+' wilayah';
      tbody.innerHTML = visible.map(({row,item}) => '<tr>'+tableColumns(data).map(index => {
        const cell = row[index];
        const value = index === 1
          ? '<button class="region-link" type="button" data-region-code="'+escape(item.code)+'">'+escape(cell)+'</button>'
          : escape(data.ikd && index === 3 ? ikdNumber.format(number(cell)) : cell);
        const tone = index === 3 ? ' class="score '+(data.ikd ? 'capacity-score ' : '')+'score-'+item.risk.toLowerCase()+'"' : '';
        return '<td'+tone+'>'+value+'</td>';
      }).join('')+'</tr>').join('');
    }
    search.addEventListener('input',paint);
    classFilter.addEventListener('change',paint);
    for (const button of root.querySelectorAll('[data-sort]')) {
      button.addEventListener('click', () => {
        const next = Number(button.dataset.sort);
        direction = next === sortColumn ? -direction : 1;
        sortColumn = next;
        root.querySelectorAll('th[aria-sort]').forEach(th => th.removeAttribute('aria-sort'));
        button.parentElement.setAttribute('aria-sort',direction === 1 ? 'ascending' : 'descending');
        paint();
      });
    }
    root.querySelector('[data-download]').addEventListener('click', () =>
      download(visible.map(({row}) => row),data.header,data.name));
    paint();
  }

  function bindChart(root, data) {
    const counts = Object.fromEntries(classes.map(label => [label,0]));
    data.items.forEach(item => { counts[item.risk]++; });
    const filter = root.querySelector('[data-risk-filter]');
    const chart = root.querySelector('[data-chart]');
    for (const label of classes) {
      const row = document.createElement('div');
      row.className = 'chart-row';
      row.style.setProperty('--risk-color', (data.ikd ? capacityColors : colors)[label]);
      row.innerHTML = '<button type="button" aria-pressed="false">'+label+
        '</button><meter min="0" max="'+data.items.length+'" value="'+counts[label]+'"></meter><strong>'+counts[label]+'</strong>';
      const button = row.querySelector('button');
      button.addEventListener('click', () => {
        filter.value = filter.value === label ? '' : label;
        filter.dispatchEvent(new Event('change'));
        filter.focus();
      });
      filter.addEventListener('change', () => button.setAttribute('aria-pressed',String(filter.value === label)));
      chart.append(row);
    }
  }

  const relief = new Image();
  const profileLayouts = new Set();
  function refreshProfileLayouts() {
    for (const layout of profileLayouts) {
      if (layout.card.isConnected) layout.refresh();
      else {
        layout.observer?.disconnect();
        profileLayouts.delete(layout);
      }
    }
  }
  window.addEventListener('beforeprint',refreshProfileLayouts);
  window.addEventListener('afterprint',refreshProfileLayouts);
  let profileResize;
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(profileResize);
    profileResize=requestAnimationFrame(refreshProfileLayouts);
  });
  window.addEventListener('irbi-layout',refreshProfileLayouts);
  const reliefReady = new Promise(resolve => {
    relief.onload = resolve;
    relief.onerror = resolve;
  });
  relief.src = 'assets/relief-indonesia-gebco.jpg';
  const reliefExtent = {west:82,east:151,south:-23,north:18};
  let provinceLandPaths;
  function drawProvinceLand(context) {
    if (!provinceLandPaths) {
      provinceLandPaths=Object.values(IRBI_DATA.provinceShapes).map(polygons=>{
        const path=new Path2D();
        for (const polygon of polygons) for (const ring of polygon) {
          ring.forEach(([x,y],index)=>index ? path.lineTo(x,y) : path.moveTo(x,y));
          path.closePath();
        }
        return path;
      });
    }
    context.save();
    context.fillStyle='#e7e8e9';
    context.globalAlpha=.75;
    for (const path of provinceLandPaths) context.fill(path,'evenodd');
    context.globalAlpha=.65;
    context.strokeStyle='#7b858b';
    context.lineWidth=.8/Math.abs(context.getTransform().a);
    for (const path of provinceLandPaths) context.stroke(path);
    context.restore();
  }
  const atlasLabels = [
    ['SAMUDRA HINDIA',102,-8],['LAUT JAWA',111,-5],['LAUT NATUNA',107,3],
    ['LAUT BANDA',129,-5],['LAUT SULAWESI',123,4],['SAMUDRA PASIFIK',135,8],
    ['LAUT ARAFURA',137,-8],['LAUT FLORES',119,-7.4],['LAUT MALUKU',126,1.3],
    ['MALAYSIA',102,4],['FILIPINA',122,9],['TIMOR-LESTE',126,-8.8],
    ['PAPUA NUGINI',145,-5],['AUSTRALIA',133,-13]
  ];

  function drawRelief(context, bounds, width, height) {
    if (!relief.naturalWidth) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const {west,east,south,north} = reliefExtent;
    const {x,y,w,h} = bounds;
    context.save();
    context.fillStyle = '#e8eff3';
    context.fillRect(0,0,width,height);
    context.globalAlpha = .52;
    context.filter = 'saturate(40%)';
    context.drawImage(relief,(west-x)*width/w,(y-north)*height/h,
      (east-west)*width/w,(north-south)*height/h);
    context.restore();
  }

  function labelPoint(polygons) {
    let best;
    let largest = -1;
    for (const [ring] of polygons) {
      let area = 0, x = 0, y = 0;
      for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
        const [x0,y0] = ring[j], [x1,y1] = ring[i];
        const cross = x0*y1-x1*y0;
        area += cross;
        x += (x0+x1)*cross;
        y += (y0+y1)*cross;
      }
      if (Math.abs(area)>largest && area) {
        largest = Math.abs(area);
        best = [x/(3*area),y/(3*area)];
      }
    }
    return {point:best || polygons[0][0][0], area:largest};
  }

  const locatorBounds = {west:93,north:8,spanX:49,spanY:21};
  let locatorBase;
  let locatorHasRelief = false;
  function locatorBackground(inset) {
    const hasRelief = Boolean(relief.naturalWidth);
    if (locatorBase && locatorHasRelief === hasRelief) return locatorBase;
    const image = document.createElement('canvas');
    image.width = inset.width;
    image.height = inset.height;
    const ink = image.getContext('2d');
    ink.fillStyle = '#e0ecef';
    ink.fillRect(0,0,image.width,image.height);
    const {west,north,spanX,spanY} = locatorBounds;
    drawRelief(ink,{x:west,y:north,w:spanX,h:spanY},image.width,image.height);
    ink.fillStyle = '#dce0dc';
    ink.beginPath();
    for (const polygons of Object.values(IRBI_DATA.provinceShapes)) for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach(([lon,lat],index) => {
          const x = (lon-west)*image.width/spanX;
          const y = (north-lat)*image.height/spanY;
          if (index === 0) ink.moveTo(x,y); else ink.lineTo(x,y);
        });
        ink.closePath();
      }
    }
    ink.fill('evenodd');
    locatorBase = image;
    locatorHasRelief = hasRelief;
    return image;
  }

  function bindMap(root, page, data, card) {
    const palette = data.status ? data.palette : data.ikd ? capacityColors : colors;
    const canvas = card.querySelector('[data-map]');
    const context = canvas.getContext('2d');
    const inset = card.querySelector('[data-map-inset]');
    const insetContext = inset.getContext('2d');

    const scaleBar = card.querySelector('[data-map-scale]');
    const axisLat = card.querySelector('[data-axis-lat]');
    const axisLon = card.querySelector('[data-axis-lon]');
    const status = card.querySelector('[data-map-status]');
    const classFilter = data.status ? card.querySelector('[data-status-year]') : root.querySelector('[data-risk-filter]');
    const select = card.querySelector('[data-map-region]');
    const items = new Map(data.items.map(item => [item.code,item]));
    const chunks = [];
    const islandChunks = [];
    const islandConfig = IRBI_DATA.islandInsets?.[page.kode];
    let islandFrame, islandTransform;
    const islandBounds={left:Infinity,right:-Infinity,top:-Infinity,bottom:Infinity};
    const mainPolygon=(polygon,code)=>{
      if (!islandConfig) return true;
      if (page.kode==='31' && code==='3101') return false;
      const xs=polygon[0].map(point=>point[0]),ys=polygon[0].map(point=>point[1]);
      const [west,south,east,north]=islandConfig.mainlandWindow;
      return Math.min(...xs)<=east && Math.max(...xs)>=west &&
        Math.min(...ys)<=north && Math.max(...ys)>=south;
    };
    const shapes = data.provinces ? IRBI_DATA.provinceShapes : IRBI_DATA.shapes;
    const mapLabels = new Map();
    let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
    for (const [code, polygons] of Object.entries(shapes)) {
      if (page.kode && !code.startsWith(page.kode)) continue;
      const key = code;
      const county = countyByCode.get(code);
      const item = items.get(key) || {code:key, name:county?.[1] || code, risk:'Tanpa nilai'};
      if (!items.has(key)) items.set(key,item);
      const mainPolygons=polygons.filter(polygon=>mainPolygon(polygon,code));
      const remotePolygons=polygons.filter(polygon=>!mainPolygon(polygon,code));
      if (remotePolygons.length) {
        const islandPath=new Path2D();
        for (const polygon of remotePolygons) for (const ring of polygon) {
          ring.forEach(([x,y],index)=>{
            islandBounds.left=Math.min(islandBounds.left,x);
            islandBounds.right=Math.max(islandBounds.right,x);
            islandBounds.top=Math.max(islandBounds.top,y);
            islandBounds.bottom=Math.min(islandBounds.bottom,y);
            if (index) islandPath.lineTo(x,y); else islandPath.moveTo(x,y);
          });
          islandPath.closePath();
        }
        islandChunks.push({path:islandPath,item,polygons:remotePolygons});
      }
      if (!mainPolygons.length) continue;
      const path = new Path2D();
      for (const polygon of mainPolygons) for (const ring of polygon) {
        ring.forEach(([x,y],index) => {
          left = Math.min(left,x); right = Math.max(right,x);
          top = Math.max(top,y); bottom = Math.min(bottom,y);
          if (index === 0) path.moveTo(x,y); else path.lineTo(x,y);
        });
        path.closePath();
      }
      chunks.push({path,item});
      const anchor = labelPoint(mainPolygons);
      if (!mapLabels.has(key) || mapLabels.get(key).area < anchor.area) mapLabels.set(key,{...anchor,item});
    }
    const provinceLabelling = !page.kode;
    const provinceBorder = new Path2D();
    for (const border of IRBI_DATA.provinceLines) {
      if (page.kode && !border.codes.includes(page.kode)) continue;
      for (const line of border.lines) {
        line.forEach(([x,y],index)=>index ? provinceBorder.lineTo(x,y) : provinceBorder.moveTo(x,y));
      }
    }
    const labelPaths = new Map();
    {
      if (provinceLabelling) mapLabels.clear();
      for (const [code,polygons] of Object.entries(IRBI_DATA.provinceShapes)) {
        if (page.kode && code !== page.kode) continue;
        const row=IRBI_DATA.tables['indeks-provinsi'].rows.find(row=>row.at(-1)===code);
        const path=new Path2D();
        for (const polygon of polygons) for (const ring of polygon) {
          ring.forEach(([x,y],index)=>index ? path.lineTo(x,y) : path.moveTo(x,y));
          path.closePath();
        }
        labelPaths.set(code,path);
        if (provinceLabelling) mapLabels.set(code,{...labelPoint(polygons),item:{code,name:row[1]}});
      }
    }
    if (select) select.add(new Option('Pilih wilayah',''));
    for (const item of [...items.values()].sort((a,b) => a.name.localeCompare(b.name,'id'))) {
      select?.add(new Option(item.name,item.code));
    }

    let fit = Math.min((canvas.width-80)/(right-left),(canvas.height-(page.kode ? 85 : 180))/(top-bottom));
    let homeX = (left+right)/2;
    let homeY = (top+bottom)/2-(page.kode ? 0 : 18/fit);
    let scale = fit, centerX = homeX, centerY = homeY;
    let active = '';
    let transform;
    let drag;
    function fitProfile() {
      if (!page.kode || !card.isConnected) return;
      const plot=canvas.getBoundingClientRect();
      if (!plot.width || !plot.height) return;
      const margin=18;
      const obstacles=[...card.querySelectorAll('.map-key,.map-source,.map-orientation')].map(box=>{
        const rect=box.getBoundingClientRect();
        return {
          x0:(rect.left-plot.left)*canvas.width/plot.width-12,
          y0:(rect.top-plot.top)*canvas.height/plot.height-12,
          x1:(rect.right-plot.left)*canvas.width/plot.width+12,
          y1:(rect.bottom-plot.top)*canvas.height/plot.height+12
        };
      }).filter(box=>box.x1>0 && box.x0<canvas.width && box.y1>0 && box.y0<canvas.height);
      const maximum=Math.min((canvas.width-2*margin)/(right-left),(canvas.height-2*margin)/(top-bottom));
      const midX=(left+right)/2, midY=(top+bottom)/2;
      const mask=document.createElement('canvas');
      mask.width=canvas.width;
      mask.height=canvas.height;
      const ink=mask.getContext('2d',{willReadFrequently:true});
      ink.setTransform(maximum,0,0,-maximum,canvas.width/2-midX*maximum,canvas.height/2+midY*maximum);
      for (const {path} of chunks) ink.fill(path,'evenodd');
      const pixels=ink.getImageData(0,0,mask.width,mask.height).data;
      const stride=mask.width+1;
      const sums=new Uint32Array(stride*(mask.height+1));
      for (let y=0;y<mask.height;y++) {
        let row=0;
        for (let x=0;x<mask.width;x++) {
          row+=pixels[(y*mask.width+x)*4+3] ? 1 : 0;
          sums[(y+1)*stride+x+1]=sums[y*stride+x+1]+row;
        }
      }
      const hits=(box,ratio,dx,dy)=>{
        const x0=Math.max(0,Math.min(mask.width,Math.floor((box.x0-canvas.width/2-dx)/ratio+canvas.width/2)));
        const x1=Math.max(0,Math.min(mask.width,Math.ceil((box.x1-canvas.width/2-dx)/ratio+canvas.width/2)));
        const y0=Math.max(0,Math.min(mask.height,Math.floor((box.y0-canvas.height/2-dy)/ratio+canvas.height/2)));
        const y1=Math.max(0,Math.min(mask.height,Math.ceil((box.y1-canvas.height/2-dy)/ratio+canvas.height/2)));
        return sums[y1*stride+x1]-sums[y0*stride+x1]-sums[y1*stride+x0]+sums[y0*stride+x0]>0;
      };
      const offsets=room=>{
        const result=[0,-room,room];
        for (let offset=14;offset<room;offset+=14) result.push(-offset,offset);
        return result.sort((a,b)=>Math.abs(a)-Math.abs(b));
      };
      let placement;
      const insetFrames=[];
      if (islandChunks.length) {
        for (const x of [18,canvas.width-266,(canvas.width-248)/2]) {
          for (const y of [18,canvas.height-268,(canvas.height-250)/2]) {
            const frame={x0:x,y0:y,x1:x+248,y1:y+250};
            if (!obstacles.some(box=>Math.min(frame.x1,box.x1+10)>Math.max(frame.x0,box.x0-10) &&
                Math.min(frame.y1,box.y1+10)>Math.max(frame.y0,box.y0-10))) insetFrames.push(frame);
          }
        }
      } else insetFrames.push(null);
      for (let step=0;step<=40 && !placement;step++) {
        const ratio=1-step*.015;
        const horizontal=(canvas.width-2*margin-(right-left)*maximum*ratio)/2;
        const vertical=(canvas.height-2*margin-(top-bottom)*maximum*ratio)/2;
        let cost=Infinity;
        for (const frame of insetFrames) for (const dx of offsets(Math.max(0,horizontal))) for (const dy of offsets(Math.max(0,vertical))) {
          const distance=dx*dx+dy*dy;
          if (distance>=cost || obstacles.some(box=>hits(box,ratio,dx,dy)) ||
              (frame && hits({x0:frame.x0-12,y0:frame.y0-12,x1:frame.x1+12,y1:frame.y1+12},ratio,dx,dy))) continue;
          placement={ratio,dx,dy,frame};
          cost=distance;
        }
      }
      const chosen=placement || {ratio:.4,dx:0,dy:0};
      islandFrame=chosen.frame;
      fit=maximum*chosen.ratio;
      homeX=midX-chosen.dx/fit;
      homeY=midY+chosen.dy/fit;
      scale=fit;
      centerX=homeX;
      centerY=homeY;
    }
    function edgeTick(x0,y0,x1,y1) {
      context.save();
      context.strokeStyle = '#406772';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x0,y0);
      context.lineTo(x1,y1);
      context.stroke();
      context.restore();
    }
    function drawFurniture() {
      const degreesX = canvas.width / scale;
      const degreesY = canvas.height / scale;
      const lon0 = centerX-degreesX/2;
      const lat1 = centerY+degreesY/2;
      const steps = [0.05,0.1,0.2,0.5,1,2,5,10,20];
      const stepX = steps.find(value => value >= degreesX/7) || 20;
      const stepY = steps.find(value => value >= degreesY/4) || 20;
      const latLabels = [];
      const lonLabels = [];
      context.resetTransform();

      context.strokeStyle = '#466d7845';
      context.lineWidth = 1;
      for (let lon=Math.ceil(lon0/stepX)*stepX; lon<lon0+degreesX; lon+=stepX) {
        const x=(lon-lon0)*scale;
        if (x<40 || x>canvas.width-65) continue;
        context.beginPath(); context.moveTo(x,0); context.lineTo(x,canvas.height); context.stroke();
        lonLabels.push('<span style="left:'+(x/canvas.width*100)+'%">'+numberText.format(Math.abs(lon))+'° '+(lon<0 ? 'BB' : 'BT')+'</span>');

        edgeTick(x,canvas.height,x,canvas.height-7);
      }
      for (let lat=Math.floor(lat1/stepY)*stepY; lat>lat1-degreesY; lat-=stepY) {
        const y=(lat1-lat)*scale;
        if (y<32 || y>canvas.height-12) continue;
        context.beginPath(); context.moveTo(0,y); context.lineTo(canvas.width,y); context.stroke();
        latLabels.push('<span style="top:'+(y/canvas.height*100)+'%">'+numberText.format(Math.abs(lat))+'°'+(lat > .00001 ? ' LU' : lat < -.00001 ? ' LS' : '')+'</span>');

        edgeTick(canvas.width,y,canvas.width-7,y);
      }
      axisLat.innerHTML = latLabels.join('');
      axisLon.innerHTML = lonLabels.join('');
      const kmPerDegree = 111.32 * Math.max(.1,Math.cos(centerY*Math.PI/180));
      const targetKm = degreesX*kmPerDegree*.10;
      const power = 10**Math.floor(Math.log10(targetKm));
      const value = ([5,2,1].find(size => size*power<=targetKm) || 1)*power;
      scaleBar.innerHTML = '<span>0</span><i aria-hidden="true"></i><span>'+numberText.format(value)+' km</span>';
      scaleBar.setAttribute('aria-label','Skala perkiraan '+numberText.format(value)+' kilometer');
      scaleBar.style.setProperty('--bar-size', (value/kmPerDegree/degreesX*100)+'cqw');
      insetContext.drawImage(locatorBackground(inset),0,0);
      const {west,north,spanX,spanY} = locatorBounds;
      insetContext.lineWidth=2;
      insetContext.strokeStyle='#9a353b';
      const x = (lon0-west)*inset.width/spanX;
      const y = (north-lat1)*inset.height/spanY;
      const x0 = Math.max(1,x);
      const y0 = Math.max(1,y);
      const x1 = Math.min(inset.width-1,x+degreesX*inset.width/spanX);
      const y1 = Math.min(inset.height-1,y+degreesY*inset.height/spanY);
      if (x1>x0 && y1>y0) insetContext.strokeRect(x0,y0,x1-x0,y1-y0);
      context.setTransform(transform);
    }

    function drawIslandInset() {
      if (!islandFrame || !islandChunks.length) return;
      const {x0,y0,x1,y1}=islandFrame;
      const width=x1-x0,height=y1-y0;
      const midX=(islandBounds.left+islandBounds.right)/2;
      const midY=(islandBounds.top+islandBounds.bottom)/2;
      const insetScale=Math.min((width-22)/(islandBounds.right-islandBounds.left),
        (height-62)/(islandBounds.top-islandBounds.bottom));
      const plotX=x0+7,plotY=y0+29,plotWidth=width-14,plotHeight=height-51;
      context.save();
      context.resetTransform();
      context.fillStyle='#ffffff';
      context.fillRect(x0,y0,width,height);
      context.strokeStyle='#35454d';
      context.lineWidth=1.2;
      context.strokeRect(x0,y0,width,height);
      context.font='700 12px Arial';
      context.fillStyle='#263942';
      context.fillText(islandConfig.title,x0+9,y0+18,width-18);
      context.beginPath();
      context.rect(plotX,plotY,plotWidth,plotHeight);
      context.clip();
      context.translate(plotX,plotY);
      drawRelief(context,{x:midX-plotWidth/(2*insetScale),y:midY+plotHeight/(2*insetScale),
        w:plotWidth/insetScale,h:plotHeight/insetScale},plotWidth,plotHeight);
      islandTransform=new DOMMatrix([insetScale,0,0,-insetScale,
        plotX+plotWidth/2-midX*insetScale,plotY+plotHeight/2+midY*insetScale]);
      context.setTransform(islandTransform);
      drawProvinceLand(context);
      for (const {path,item} of islandChunks) {
        context.fillStyle=palette[item.risk] || palette['Tanpa nilai'];
        context.fill(path,'evenodd');
        context.strokeStyle=item.code===active ? '#173a64' : '#48585d';
        context.lineWidth=(item.code===active ? 1.8 : .8)/insetScale;
        context.stroke(path);
      }
      context.restore();
      context.save();
      context.resetTransform();
      context.font='9px Arial';
      context.fillStyle='#40525a';
      context.fillText('Skala berbeda dari peta utama',x0+9,y1-8);
      context.restore();
      canvas.dataset.islandInset=JSON.stringify(islandFrame);
    }

    function draw() {
      transform = new DOMMatrix([scale,0,0,-scale,canvas.width/2-centerX*scale,canvas.height/2+centerY*scale]);
      context.resetTransform();
      context.clearRect(0,0,canvas.width,canvas.height);
      drawRelief(context,{
        x:centerX-canvas.width/(scale*2),y:centerY+canvas.height/(scale*2),
        w:canvas.width/scale,h:canvas.height/scale
      },canvas.width,canvas.height);
      context.setTransform(transform);
      drawProvinceLand(context);
      for (const {path,item} of chunks) {
        context.fillStyle = classFilter?.value && classFilter.value !== item.risk
          ? '#d5d7d59c' : palette[item.risk] || palette['Tanpa nilai'];
        context.fill(path,'evenodd');
        context.strokeStyle = '#3b423bad';
        context.lineWidth = .7/scale;
        context.stroke(path);
      }
      if (!data.provinces) {
        context.strokeStyle = '#35454d';
        context.lineWidth = 1.6/scale;
        context.stroke(provinceBorder);
      }
      context.strokeStyle = '#173a64';
      context.lineWidth = 2/scale;
      for (const {path,item} of chunks) if (item.code === active) context.stroke(path);
      drawFurniture();
      drawLabels();
      drawIslandInset();
      if (page.kode) {
        canvas.dataset.profileTransform=JSON.stringify([scale,centerX,centerY]);
        canvas.dataset.profileBounds=JSON.stringify([
        canvas.width/2+(left-centerX)*scale,canvas.height/2-(top-centerY)*scale,
        canvas.width/2+(right-centerX)*scale,canvas.height/2-(bottom-centerY)*scale
      ]);
      }
    }

    function drawLabels() {
      const placed = [];
      context.resetTransform();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const drawLabel = (name,lon,lat,background) => {
        const sea = background && /^(LAUT|SAMUDRA) /.test(name);
        const country = background && !sea;
        const x = canvas.width/2+(lon-centerX)*scale;
        const y = canvas.height/2-(lat-centerY)*scale;
        context.font = background ? (sea ? 'italic 600 9px Arial' : 'italic 700 10px Arial') : '600 17px Arial';
        context.letterSpacing = sea ? '1.3px' : '0px';
        const width = context.measureText(name).width+9;
        if (x-width/2<10 || x+width/2>canvas.width-10 || y<32 || y>canvas.height-10) return;
        if (page.kode && x<270) return;
        if (!page.kode && ((x>945 && y<175) || (y>580 && (x<235 || x>935)))) return;
        if (placed.some(box => Math.abs(x-box.x)<(width+box.width)/2 && Math.abs(y-box.y)<19)) return;
        placed.push({x,y,width});
        if (country) {
          context.fillStyle = '#fff36ac9';
          context.fillRect(x-width/2,y-6,width,12);
        } else {
          context.lineWidth = sea ? 1 : 3;
          context.strokeStyle = sea ? '#e7f0f780' : '#fffffff2';
          context.strokeText(name,x,y);
        }
        context.fillStyle = sea ? '#2164ae' : country ? '#1f2522' : '#182826';
        context.fillText(name,x,y);
        context.letterSpacing = '0px';
      };
      const provinceLabels = {
        '11':[95.6,4.8,95.6,7.8], '12':[98.8,2.4,98.8,6.3],
        '13':[100.5,-.8,100.5,-4.0], '14':[101.8,.5,101.8,4.5],
        '15':[103.5,-1.5,103.5,.3], '16':[104.5,-3.2,104.5,-.8],
        '17':[102.3,-3.8,102.3,-7.0], '18':[105.2,-5.0,105.2,-9.2],
        '19':[106.5,-2.2,106.5,1.7], '21':[104.6,1.0,104.6,5.3],
        '31':[106.8,-6.1,106.8,-3.6], '36':[106.1,-6.5,106.1,-8.0],
        '32':[108.1,-7.0,108.1,-10.9], '33':[110.5,-7.0,110.5,-4.8],
        '34':[110.4,-7.8,111.5,-12.0], '35':[113,-7.4,113,-4.8],
        '51':[115.2,-8.4,115.2,-10.0], '52':[117.5,-8.6,117.5,-12.0],
        '53':[122.6,-9.6,122.6,-12.0],
        '61':[110.7,.0,110.7,1.7], '62':[113.6,-1.8,113.6,-.7],
        '63':[115.3,-3.3,115.3,-5.2], '64':[116.8,.4,116.8,2.0],
        '65':[116.5,3.0,116.5,7.0],
        '76':[119.2,-2.5,119.2,5.0], '72':[120.6,-1.0,120.6,2.6],
        '73':[119.8,-4.7,119.8,-7.0], '74':[122.3,-4.0,122.3,-7.0],
        '75':[122.4,.6,122.4,1.7], '71':[125,1.2,125,4.0],
        '81':[129.5,-3.4,129.5,-6.0], '82':[127.7,.8,127.7,5.3],
        '96':[131.5,-1.0,131.5,3.7], '92':[133.5,-2.0,133.5,1.7],
        '94':[136,-4.1,136,-7.0], '95':[138.2,-4.0,138.2,2.5],
        '91':[140,-2.8,140,-.6], '93':[140,-6.8,140,-9.2]
      };
      const labels=[];
      const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+5 &&
        Math.abs(a.y-b.y)<(a.height+b.height)/2+5;
      const lineHits=(a,b,box)=>{
        for (let step=0;step<=20;step++) {
          const ratio=step/20;
          const x=a.x+(b.x-a.x)*ratio, y=a.y+(b.y-a.y)*ratio;
          if (Math.abs(x-box.x)<box.width/2+3 && Math.abs(y-box.y)<box.height/2+3) return true;
        }
        return false;
      };
      const routeHits=(route,box)=>route.slice(1).some((point,index)=>lineHits(route[index],point,box));
      const leaderRoutes=(anchor,box)=>{
        const left=box.x-box.width/2-3, right=box.x+box.width/2+3;
        const top=box.y-box.height/2-3, bottom=box.y+box.height/2+3;
        if (anchor.x>=left && anchor.x<=right) {
          return [[anchor,{x:anchor.x,y:anchor.y<box.y ? top : bottom}]];
        }
        if (anchor.y>=top && anchor.y<=bottom) {
          return [[anchor,{x:anchor.x<box.x ? left : right,y:anchor.y}]];
        }
        return [
          [anchor,{x:box.x,y:anchor.y},{x:box.x,y:anchor.y<box.y ? top : bottom}],
          [anchor,{x:anchor.x,y:box.y},{x:anchor.x<box.x ? left : right,y:box.y}]
        ];
      };
      const project=([lon,lat])=>({
        x:canvas.width/2+(lon-centerX)*scale,
        y:canvas.height/2-(lat-centerY)*scale
      });
      const offshoreMap = provinceLabelling && !data.provinces;
      let landMask;
      if (offshoreMap) {
        const mask=document.createElement('canvas');
        mask.width=canvas.width;
        mask.height=canvas.height;
        const ink=mask.getContext('2d',{willReadFrequently:true});
        ink.setTransform(transform);
        for (const path of labelPaths.values()) ink.fill(path,'evenodd');
        const pixels=ink.getImageData(0,0,mask.width,mask.height).data;
        const stride=mask.width+1;
        landMask=new Uint32Array(stride*(mask.height+1));
        for (let y=0;y<mask.height;y++) {
          let row=0;
          for (let x=0;x<mask.width;x++) {
            row+=pixels[(y*mask.width+x)*4+3] ? 1 : 0;
            landMask[(y+1)*stride+x+1]=landMask[y*stride+x+1]+row;
          }
        }
      }
      const coversLand=box=>{
        const stride=canvas.width+1;
        const x0=Math.max(0,Math.floor(box.x-box.width/2-3));
        const x1=Math.min(canvas.width,Math.ceil(box.x+box.width/2+3));
        const y0=Math.max(0,Math.floor(box.y-box.height/2-3));
        const y1=Math.min(canvas.height,Math.ceil(box.y+box.height/2+3));
        return landMask[y1*stride+x1]-landMask[y0*stride+x1]-
          landMask[y1*stride+x0]+landMask[y0*stride+x0]>0;
      };
      for (const {point,item} of [...mapLabels.values()].sort((a,b)=>a.area-b.area)) {
        const offshore = offshoreMap && ['19','21','31','32','33','34','35','36','51','52','71','75','76','82'].includes(item.code);
        const anchor=project(provinceLabelling ? IRBI_DATA.capitals[item.code].koordinat : point);
        const middle=project(point);
        const displayName=item.name.replace('KEPULAUAN','KEP.').replace('DAERAH ISTIMEWA','DI');
        const words=displayName.split(' ');
        const lines=words.length>1 ? [words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')] : words;
        context.font='700 10px Arial';
        const width=Math.max(...lines.map(line=>context.measureText(line).width))+8;
        const height=lines.length*12;
        const path=labelPaths.get(item.code) || chunks.find(chunk=>chunk.item.code===item.code).path;
        const offshoreTargets={
          '33':[110.42,-5.95],
          '61':[107.8,.2],'62':[112,-4.8],'63':[115.3,-5.0],
          '64':[118.6,.2],'65':[119.1,3.4],'93':[136,-8.4]
        };
        const preferred=provinceLabelling ? project(
          (offshore && offshoreTargets[item.code]) || provinceLabels[item.code].slice(2)
        ) : {x:anchor.x,y:anchor.y-28};
        const angle=Math.atan2(preferred.y-anchor.y,preferred.x-anchor.x);
        const candidates=offshore ? [] : [{...middle,direct:true}];
        for (const radius of [22,34,46,60,78,96,120]) {
          for (const offset of [0,.5,-.5,1,-1,1.6,-1.6,Math.PI]) {
            candidates.push({
              x:anchor.x+Math.cos(angle+offset)*radius,
              y:anchor.y+Math.sin(angle+offset)*radius,direct:false
            });
          }
        }
        if (offshore) candidates.push(...candidates.map(candidate=>({...candidate,allowLand:true})));
        let best, bestCost=Infinity;
        for (const candidate of candidates) {
          const box={...candidate,width,height};
          if (box.x-width/2<9 || box.x+width/2>canvas.width-9 ||
              box.y-height/2<12 || box.y+height/2>canvas.height-12) continue;
          if (box.y>canvas.height-145 && (box.x<230 || box.x>canvas.width-285)) continue;
          if (!data.ikd && overlaps(box,{
            x:canvas.width-220,y:canvas.height-120,width:440,height:240
          })) continue;
          if (box.x>canvas.width-180 && box.y<145) continue;
          if (card.closest('.spread-wide') && box.x-box.width/2<canvas.width/2+16 &&
              box.x+box.width/2>canvas.width/2-16) continue;
          if (islandFrame && Math.min(box.x+box.width/2,islandFrame.x1+6)>Math.max(box.x-box.width/2,islandFrame.x0-6) &&
              Math.min(box.y+box.height/2,islandFrame.y1+6)>Math.max(box.y-box.height/2,islandFrame.y0-6)) continue;
          const onLand = offshore && coversLand(box);
          if (onLand && !candidate.allowLand) continue;
          if (candidate.direct) {
            const corners=[[-1,-1],[-1,1],[1,-1],[1,1]];
            if (!corners.every(([dx,dy])=>context.isPointInPath(path,
              centerX+(box.x+dx*width/2-canvas.width/2)/scale,
              centerY-(box.y+dy*height/2-canvas.height/2)/scale,'evenodd'))) continue;
          }
          if (labels.some(other=>overlaps(box,other))) continue;
          const routes=candidate.direct ? [[]] : leaderRoutes(anchor,box);
          const route=routes.sort((a,b)=>
            labels.filter(other=>routeHits(a,other)).length-
            labels.filter(other=>routeHits(b,other)).length)[0];
          const crossings=labels.filter(other=>
            routeHits(route,other) || (!other.direct && routeHits(other.route,box))).length;
          const distance=Math.hypot(box.x-anchor.x,box.y-anchor.y);
          const cost=(onLand ? 500 : 0)+crossings*(offshore ? 45 : 10000)+(candidate.direct ? 0 : distance+12)+
            (offshore ? Math.hypot(box.x-preferred.x,box.y-preferred.y)*(item.code==='33' ? 4 : .65) : 0)+
            (candidate.direct ? 0 : Math.abs(Math.atan2(Math.sin(Math.atan2(box.y-anchor.y,box.x-anchor.x)-angle),
              Math.cos(Math.atan2(box.y-anchor.y,box.x-anchor.x)-angle)))*5);
          if (cost<bestCost) {best={...box,route};bestCost=cost;}
        }
        if (best) labels.push({...best,anchor,lines,capital:provinceLabelling});
      }
      for (const label of labels) {
        if (label.direct) continue;
        context.beginPath();
        context.moveTo(label.route[0].x,label.route[0].y);
        for (const point of label.route.slice(1)) context.lineTo(point.x,point.y);
        context.lineWidth=1;
        context.strokeStyle='#34454e';
        context.stroke();
      }
      canvas.dataset.labelCount=String(labels.length);
      for (const label of labels) {
        if (label.capital) {
          context.beginPath();
          context.arc(label.anchor.x,label.anchor.y,2.7,0,2*Math.PI);
          context.fillStyle='#123b68';
          context.fill();
          context.strokeStyle='#ffffff';
          context.lineWidth=1;
          context.stroke();
        }
        context.font='700 10px Arial';
        label.lines.forEach((line,index)=>{
          const y=label.y+(index-(label.lines.length-1)/2)*12;
          context.lineWidth=3;
          context.strokeStyle='#ffffff';
          context.strokeText(line,label.x,y);
          context.fillStyle='#17272a';
          context.fillText(line,label.x,y);
        });
      }
      if (page.kode && IRBI_DATA.capitals[page.kode]) {
        const capital=project(IRBI_DATA.capitals[page.kode].koordinat);
        context.beginPath();
        context.arc(capital.x,capital.y,2.7,0,2*Math.PI);
        context.fillStyle='#123b68';
        context.fill();
        context.strokeStyle='#ffffff';
        context.lineWidth=1;
        context.stroke();
      }
      context.textAlign = 'start';
      context.textBaseline = 'alphabetic';
      context.setTransform(transform);
    }

    function show(item) {
      if (data.status) {
        status.textContent = item
          ? item.name+' · '+(item.score ? 'Penilaian terakhir tercatat '+item.score : 'Tidak ada catatan dalam CSV hingga 2025')
          : '';
        return;
      }
      status.textContent = item
        ? item.name+' · '+(item.score ? (data.ikd ? ikdNumber.format(number(item.score))+' · kapasitas ' : item.score+' · ')+item.risk.toLocaleLowerCase('id') : 'tanpa nilai dalam tabel sumber')
        : '';
      status.hidden = !item;
    }
    function choose(key, move = false) {
      active = key;
      markRow();
      if (select) select.value = key;
      if (move && key) {
        const region = chunks.filter(({item}) => item.code === key);
        if (region.length) {
          const mid = centroids.get(key);
          if (mid) [centerX,centerY] = mid;
        }
      }
      show(items.get(key));
      draw();
    }
    const centroids = new Map();
    for (const [code, polygons] of Object.entries(shapes)) {
      const key = code;
      if (!items.has(key) || centroids.has(key)) continue;
      centroids.set(key,polygons[0][0][0]);
    }

    select?.addEventListener('change', () => choose(select.value, scale > fit));
    for (const button of card.querySelectorAll('[data-map-zoom]')) button.addEventListener('click', () => {
      if (button.dataset.mapZoom === 'reset') {
        scale = fit;
        centerX = homeX;
        centerY = homeY;
      } else {
        scale = Math.max(fit,Math.min(fit*16,scale*(button.dataset.mapZoom === 'in' ? 1.5 : 2/3)));
        if (active && centroids.has(active)) [centerX,centerY] = centroids.get(active);
      }
      draw();
    });
    function coordinates(event) {
      const box = canvas.getBoundingClientRect();
      return [(event.clientX-box.left)*canvas.width/box.width, (event.clientY-box.top)*canvas.height/box.height];
    }
    function hit(event) {
      const [x,y] = coordinates(event);
      if (islandFrame && islandTransform && x>=islandFrame.x0 && x<=islandFrame.x1 && y>=islandFrame.y0 && y<=islandFrame.y1) {
        context.save();
        context.setTransform(islandTransform);
        const item=islandChunks.find(({path})=>context.isPointInPath(path,x,y,'evenodd'))?.item;
        context.restore();
        return item;
      }
      return chunks.find(({path}) => context.isPointInPath(path,x,y,'evenodd'))?.item;
    }
    canvas.addEventListener('pointerdown', event => {
      const [x,y] = coordinates(event);
      drag = {x,y,centerX,centerY,moved:false};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag) { show(hit(event) || items.get(active)); return; }
      const [x,y] = coordinates(event);
      const dx = x-drag.x, dy = y-drag.y;
      if (!drag.moved && Math.hypot(dx,dy) < 5) return;
      drag.moved = true;
      centerX = drag.centerX-dx/scale;
      centerY = drag.centerY+dy/scale;
      draw();
    });
    canvas.addEventListener('pointerup', event => {
      if (drag && !drag.moved) choose(hit(event)?.code || '');
      drag = null;
    });
    canvas.addEventListener('pointercancel', () => { drag = null; });
    canvas.addEventListener('pointerleave', () => show(items.get(active)));
    root.querySelector('.table-scroll tbody')?.addEventListener('click', event => {
      const button = event.target.closest('[data-region-code]');
      if (!button) return;
      choose(button.dataset.regionCode,scale > fit);
      canvas.scrollIntoView({block:'center',behavior:'smooth'});
    });
    function markRow() {
      root.querySelectorAll('.table-scroll [data-region-code]').forEach(button => {
        const selected = button.dataset.regionCode === active;
        button.setAttribute('aria-pressed',String(selected));
        button.closest('tr').classList.toggle('map-selected',selected);
      });
    }
    classFilter?.addEventListener('change',() => { markRow(); draw(); });
    root.querySelector('[data-irbi-filter]')?.addEventListener('input',markRow);
    root.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click',markRow));
    show();
    fitProfile();
    draw();
    if (page.kode) {
      const refresh=()=>{fitProfile();draw();};
      const observer=new ResizeObserver(()=>{
        if (card.isConnected) refresh();
        else observer.disconnect();
      });
      for (const element of [canvas,...card.querySelectorAll('.map-key,.map-source,.map-orientation')]) observer.observe(element);
      profileLayouts.add({card,refresh,observer});
    }
    if (!relief.complete) reliefReady.then(draw);
  }

  function bind(root, page) {
    root.querySelectorAll('[data-method-csv]').forEach(button => {
      button.addEventListener('click', () => {
        const matrix = page.matriks.find(item => item.judul === button.dataset.methodTitle);
        download(matrix.baris, matrix.kolom, 'metodologi-halaman-'+button.dataset.methodCsv);
      });
    });
    const statusCard = root.querySelector('[data-ikd-status]');
    if (statusCard) bindMap(statusCard,page,ikdStatusData(page.ikd.snapshot),statusCard);
    const data = dataset(page);
    const card = root.querySelector('.atlas-card:not([data-ikd-status])');
    if (!data || !card) return;
    if (!data.ikd) {
      bindTable(root,data);
      bindChart(root,data);
    }
    bindMap(root,page,data,card);
  }

  function bindSpread(root,page) {
    const card=root.querySelector('.atlas-card');
    if (!card) return;
    const data=card.hasAttribute('data-ikd-status') ? ikdStatusData(page.ikd.snapshot) : dataset(page);
    const canvas=card.querySelector('[data-map]');
    const paper=getComputedStyle(document.documentElement);
    const width=parseFloat(paper.getPropertyValue('--book-page-width')) || 210;
    const height=parseFloat(paper.getPropertyValue('--book-page-height')) || 297;
    canvas.width=1600;
    canvas.height=Math.max(430,Math.round(1600*(height-44)/(2*width-18)));
    bindMap(root,page,data,card);
  }
  window.IRBI_READER = {content,bind,bindSpread,reliefReady};
})();



















