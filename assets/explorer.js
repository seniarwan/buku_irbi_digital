(function () {
  'use strict';

  const counties = IRBI_DATA.tables['indeks-kabupaten-kota'].rows;
  const catalog = [...counties].sort((a,b) => a[1].localeCompare(b[1],'id'));
  const byCode = new Map(counties.map(row => [row.at(-1),row]));
  const score = value => Number(value.replace(',','.'));
  const format = new Intl.NumberFormat('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = value => String(value).replace(/[&<>"']/g,char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);

  function selector(name, label) {
    return '<fieldset><legend>'+label+'</legend><label for="jelajah-cari-'+name+'">Cari nama wilayah</label>'+
      '<input id="jelajah-cari-'+name+'" type="search" data-compare-query="'+name+'" placeholder="Nama kabupaten, kota, atau provinsi">'+
      '<label for="jelajah-wilayah-'+name+'">Wilayah</label><select id="jelajah-wilayah-'+name+'" data-compare-select="'+name+'"></select></fieldset>';
  }

  function content() {
    return '<section class="report-spread chapter-spread explorer"><header class="chapter-title">'+
      '<p>HASIL IRBI · 2025</p><h1>Jelajah Kabupaten/Kota</h1></header>'+
      '<p>Pilih satu wilayah untuk membaca profilnya. Tambahkan wilayah kedua untuk membandingkan skor multibahaya dan skor per jenis ancaman.</p>'+
      '<div class="compare-controls">'+selector('utama','Wilayah utama')+selector('banding','Wilayah pembanding')+'</div>'+
      '<div data-compare-results></div></section>';
  }

  function hazardRows(regions) {
    return IRBI.hazards.map(name => {
      const rows = IRBI_DATA.tables['ancaman-'+irbiSlug(name)].rows;
      const matches = regions.map(region => rows.find(row => row.at(-1) === region.at(-1)));
      const mean = rows.reduce((sum,row)=>sum+score(row[3]),0)/rows.length;
      const cells = matches.map(row => row
        ? '<td><strong>'+esc(row[3].replace('.',','))+'</strong> <span class="compare-risk">'+esc(row[4].toLocaleLowerCase('id'))+'</span></td>'
        : '<td><span class="compare-missing">Tanpa nilai</span></td>').join('');
      return '<tr><th scope="row"><a href="#/ancaman-'+irbiSlug(name)+'">'+esc(name)+'</a></th>'+
        cells+'<td>'+format.format(mean)+'</td></tr>';
    }).join('');
  }

  function profile([rank,name,province,value,kind]) {
    return '<section class="compare-profile"><h2>'+esc(name)+'</h2><p>'+esc(province)+'</p>'+
      '<dl><div><dt>IRB multibahaya</dt><dd>'+esc(value)+'</dd></div>'+
      '<div><dt>Kelas risiko</dt><dd>'+esc(kind.toLocaleLowerCase('id'))+'</dd></div>'+
      '<div><dt>Peringkat nasional</dt><dd>'+esc(rank)+' dari '+counties.length+'</dd></div></dl></section>';
  }

  function bind(root,params) {
    const selects = [...root.querySelectorAll('[data-compare-select]')];
    const queries = [...root.querySelectorAll('[data-compare-query]')];
    const out = root.querySelector('[data-compare-results]');
    const chosen = [params.get('utama'),params.get('banding')].map(code=>byCode.has(code) ? code : '');
    if (chosen[0] === chosen[1]) chosen[1] = '';

    function populate(index) {
      const select = selects[index];
      const query = queries[index].value.trim().toLocaleLowerCase('id');
      select.replaceChildren(new Option('Pilih wilayah',''));
      for (const row of catalog) {
        const code = row.at(-1);
        const label = row[1]+' · '+row[2];
        if (code === chosen[1-index]) continue;
        if (code === chosen[index] || label.toLocaleLowerCase('id').includes(query) || code.includes(query)) {
          select.add(new Option(label,code));
        }
      }
      select.value = chosen[index];
    }

    function paint() {
      const regions = chosen.filter(Boolean).map(code=>byCode.get(code));
      if (!regions.length) {
        out.innerHTML='<p class="book-note">Pilih wilayah untuk melihat skor dan peringkatnya.</p>';
        return;
      }
      out.innerHTML='<div class="compare-profiles">'+regions.map(profile).join('')+'</div>'+
        '<section class="book-card"><h2 id="skor-ancaman">Skor menurut jenis ancaman</h2>'+
        '<p class="book-note">Rata-rata nasional dihitung dari kabupaten/kota dengan nilai tersedia pada masing-masing ancaman.</p>'+
        '<div class="table-scroll"><table class="compare-scores"><thead><tr><th scope="col">Jenis ancaman</th>'+
        regions.map(row=>'<th scope="col">'+esc(row[1])+'</th>').join('')+
        '<th scope="col">Rata-rata nasional</th></tr></thead><tbody>'+hazardRows(regions)+'</tbody></table></div></section>';
    }

    selects.forEach((select,index) => select.addEventListener('change',() => {
      chosen[index]=select.value;
      const next = new URLSearchParams();
      chosen.forEach((code,slot) => { if (code) next.set(slot ? 'banding' : 'utama',code); });
      history.replaceState(null,'','#/jelajah'+(next.size ? '?'+next : ''));
      populate(1-index);
      paint();
    }));
    queries.forEach((input,index)=>input.addEventListener('input',()=>populate(index)));
    selects.forEach((_,index)=>populate(index));
    paint();
  }

  window.IRBI_EXPLORER = {content,bind};
})();
