(function(){
  'use strict';
  const nav = document.getElementById('navigation');
  const view = document.getElementById('readingView');
  const toc = document.getElementById('pageToc');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('backdrop');
  const searchDialog = document.getElementById('searchDialog');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const entries = IRBI.groups.flatMap(g => g.items.map(([id,label])=>({id,label,group:g.label})));
  const screenGroups = IRBI.groups;
  const collapsed = new Set(['wilayah','ancaman']);
  let lastRoute = null;
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = id => '#/' + id;
  function route(){const raw = decodeURIComponent(location.hash.replace(/^#\/?/,'') || 'beranda').split('?')[0];return raw === 'lampiran' ? 'tim-editorial' : entries.some(e=>e.id===raw)?raw:'beranda';}
  const getPage = id => IRBI.pages[id];
  function drawNav(active){
    nav.innerHTML = screenGroups.map(g=>`<div class="nav-group ${collapsed.has(g.id)&&!g.items.some(x=>x[0]===active)?'collapsed':''}" data-id="${g.id}"><button type="button" aria-expanded="${!(collapsed.has(g.id)&&!g.items.some(x=>x[0]===active))}"><span>${esc(g.label)}</span><span class="chevron">⌄</span></button><div class="nav-items">${g.items.map(([id,label])=>`<a href="${url(id)}" class="${id===active?'active':''}" ${id===active?'aria-current="page"':''}>${esc(label)}</a>`).join('')}</div></div>`).join('');
    nav.querySelectorAll('.nav-group>button').forEach(btn=>btn.addEventListener('click',()=>{
      const parent = btn.parentElement;
      const isClosed = parent.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!isClosed));
      if(isClosed) collapsed.add(parent.dataset.id);else collapsed.delete(parent.dataset.id);
    }));
  }
  function drawToc(){
    const sections=[...view.querySelectorAll('.reading-body h2[id],.reading-body h3[id],.reading-body .source-page')];
    toc.innerHTML=`<div class="toc-heading">Pada halaman ini</div>${sections.map(h=>`<a href="#${h.id}" data-anchor="${h.id}" class="${h.tagName==='H3'?'level-3':''}">${esc(h.querySelector('h3')?.textContent || h.textContent)}</a>`).join('') || '<p class="muted small">Tidak ada subbagian.</p>'}<div class="toc-footer"><strong>NAVIGASI</strong><a href="#/beranda">Kembali ke beranda ↑</a></div>`;
    toc.querySelectorAll('[data-anchor]').forEach(a=>a.addEventListener('click',e=>{
      e.preventDefault();
      document.getElementById(a.dataset.anchor)?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }
  function applyBookLayout() {
    const dataEdition = document.documentElement.dataset.bookLayout === 'edisi-data';
    for (const profile of document.querySelectorAll('.province-spread')) {
      const chart = profile.querySelector('[data-chart]')?.closest('section');
      const destination = profile.querySelector(dataEdition ? '.profile-data-lead' : '.report-margin');
      if (chart && destination && chart.parentElement !== destination) destination.prepend(chart);
    }
  }
  window.addEventListener('irbi-layout',()=>{
    applyBookLayout();
    if (!document.body.classList.contains('print-edition') && view.firstElementChild) drawToc();
  });
  function closeMenu(){sidebar.classList.remove('open');backdrop.classList.remove('open');backdrop.hidden=true;}
  function directory(list, link) {
    return IRBI.toc2025.map(group=>'<section class="toc-book-group'+(group.label ? '' : ' toc-independent')+'">'+(group.label ? '<h2>'+(group.route ? '<a class="toc-chapter-link" href="'+link(group.route)+'">'+esc(group.label)+'</a>' : esc(group.label))+
        (group.pages ? '<span class="toc-group-pages">'+esc(group.pages)+'</span>' : '')+
        '</h2>' : '')+'<ul>'+group.items.map(([id,label,pages])=>
          '<li><a href="'+link(id)+'"><span class="toc-label">'+esc(label)+'</span>'+
          '<span class="toc-leader" aria-hidden="true"></span><span class="toc-page">'+esc(pages)+'</span></a></li>'
        ).join('')+'</ul></section>').join('');
  }

  function render(){
    const id=route();
    const page=getPage(id),index=entries.findIndex(e=>e.id===id);

    const title = (page.title || '').trim();
    document.title = `${title} — Buku Digital IRBI 2025 (Prototipe)`;
    const prev=index>0?entries[index-1]:null,next=index>=0&&index<entries.length-1?entries[index+1]:null;
    view.classList.add("report-view");
    const body = id === 'daftar-isi'
      ? '<section class="report-spread chapter-spread book-directory"><header class="chapter-title"><h1>Daftar <span class="chapter-title-accent">Isi</span></h1></header><div>'+directory(entries,url)+'</div></section>'
      : IRBI_READER.content(id,page);
    view.innerHTML=`<article class="reading-body">${body}</article><nav class="page-nav" aria-label="Halaman sebelumnya dan berikutnya">${prev?`<a href="${url(prev.id)}" class="prev">← Sebelumnya <strong>${esc(prev.label)}</strong></a>`:''}${next?`<a href="${url(next.id)}" class="next">Berikutnya → <strong>${esc(next.label)}</strong></a>`:''}</nav>`;
    IRBI_READER.bind(view,page);IRBI_PHOTOS.sync(view);applyBookLayout();drawNav(id);drawToc();closeMenu();
    if(lastRoute!==id){window.scrollTo({top:0,behavior:'instant'});lastRoute=id;}
  }
  function openSearch(){
    if(!searchDialog.open){searchDialog.showModal();searchInput.value='';searchResults.innerHTML='<div class="search-empty">Mulai ketik untuk mencari isi Buku Digital IRBI 2025.</div>';}
    searchInput.focus();
  }
  function search(){
    const query=searchInput.value.toLocaleLowerCase('id').trim();
    if(!query){searchResults.innerHTML='<div class="search-empty">Ketik nama bab, provinsi, jenis ancaman, atau istilah.</div>';return;}
    const matches = entries.map(entry => {
      const page = getPage(entry.id);
      const text = [...page.bagian.flatMap(part => [part.judul, ...part.paragraf, ...(part.daftar || []), ...(part.setelahDaftar || [])]),
        page.redaksi ? JSON.stringify(page.redaksi) : ''].join(' ');
      const table = IRBI_DATA.tables[page.dataset];
      const rows = table ? table.rows.filter(row => !page.kode || row.at(-1).startsWith(page.kode)) : [];
      return {...entry, summary:page.summary, body:[text, ...rows.map(row => row.join(' '))].join(' ')};
    }).filter(entry => [entry.label, entry.group, entry.summary, entry.body]
      .join(' ').toLocaleLowerCase('id').includes(query)).slice(0,30);
    searchResults.innerHTML=matches.length?matches.map(e=>`<a class="search-result" href="${url(e.id)}"><small>${esc(e.group)}</small><strong>${esc(e.label)}</strong><span>${esc(e.summary)}</span></a>`).join(''):'<div class="search-empty">Tidak ditemukan. Coba kata kunci lain.</div>';
    searchResults.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>searchDialog.close()));
  }
  function printEdition(sampleId) {
    document.body.classList.add('print-edition');
    document.title = 'Buku Digital IRBI 2025';
    const main = document.createElement('main');
    main.id = 'printBook';
    const bookEntries = entries.filter(entry => entry.id !== 'sampul-belakang');
    bookEntries.push(entries.find(entry => entry.id === 'sampul-belakang'));
    const groups = directory(bookEntries,id => '#cetak-'+id);
    const sample = bookEntries.find(({id}) => id === sampleId && id !== 'daftar-isi');
    const chapters = sample ? (sample.id === 'beranda' ? [] : [sample]) : bookEntries.filter(({id}) => id !== 'beranda' && id !== 'daftar-isi');
    if (sample) document.body.classList.add('style-sample-print');
    const sectionNames = new Map(IRBI.groups.map((group,index) => [group.items[0][0],{label:group.label,number:index+1}]));
    const cover = '<section class="print-cover print-chapter cover-artwork" id="cetak-beranda">'+
      '<img data-book-photo="sampul.jpg" data-cover-original="assets/foto/sampul-lengkap.png" src="assets/foto/sampul-lengkap.png" alt="Sampul Indeks Risiko Bencana Indonesia 2026"></section>';
    const front = cover+'<section class="print-toc print-chapter reading-body" id="cetak-daftar-isi"><header class="chapter-title"><h1>Daftar <span class="chapter-title-accent">Isi</span></h1></header><div>'+groups+'</div></section>';
    main.innerHTML = (sample ? (sample.id === 'beranda' ? cover : '') : front)+chapters.map(({id}) => {
        const section = sectionNames.get(id);
        const marker = section && id !== 'pendahuluan' ? '<div class="print-section-marker"><span>BAGIAN '+section.number+'</span><strong>'+esc(section.label)+'</strong></div>' : '';
        return '<article class="print-chapter report-view reading-body" id="cetak-'+id+'">'+
          marker+(id==='sampul-belakang'
            ? '<section class="cover-artwork back-cover-artwork"><img data-book-photo="sampul_belakang.png" data-cover-original="assets/foto/sampul_belakang.png" src="assets/foto/sampul_belakang.png?v=back-cover-final" alt="Sampul belakang Buku Digital IRBI"></section>'
            : IRBI_READER.content(id,getPage(id),{print:true}))+'</article>';
      }).join('');
    document.body.append(main);
    applyBookLayout();
    for (const {id} of chapters) {
      const chapter = document.getElementById('cetak-'+id);
      IRBI_READER.bind(chapter,getPage(id));
      chapter.querySelectorAll('details').forEach(detail => { detail.open = true; });
      chapter.querySelectorAll('[id]').forEach(node => { node.id = id+'-'+node.id; });
    }
    for (const link of main.querySelectorAll('a[href^="#/"]')) {
      link.setAttribute('href','#cetak-'+link.getAttribute('href').slice(2));
    }
    for (const img of main.querySelectorAll('img')) img.loading = 'eager';
    const toolbar = document.createElement('div');
    toolbar.className = 'print-toolbar';
    toolbar.innerHTML = '<a href="index.html">← Kembali ke Buku</a><strong>Pratinjau Buku IRBI 2025</strong><button type="button" data-export-pdf>Ekspor PDF</button>';
    toolbar.querySelector('button').addEventListener('click',() => window.print());
    document.body.prepend(toolbar);
    Promise.all([IRBI_READER.reliefReady,IRBI_PHOTOS.ready]).then(async () => {
      IRBI_PHOTOS.sync(main);
      await Promise.allSettled([...main.querySelectorAll('[data-book-photo] img, img[data-book-photo]')].map(image=>image.decode()));
      IRBI_SPREADS.prepare();
      document.body.dataset.printReady = 'true';
    });
  }
  const options = new URLSearchParams(location.search);
  if (options.get('pratinjau') === '1' || options.get('cetak') === '1') {
    printEdition(options.has('pratinjau-gaya') ? options.get('bab') : null);
    return;
  }
  document.getElementById('searchBtn').addEventListener('click',openSearch);
  document.getElementById('closeSearch').addEventListener('click',()=>searchDialog.close());
  searchInput.addEventListener('input',search);
  searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=searchResults.querySelector('a');if(first)first.click();}});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();openSearch();}});
  document.getElementById('menuToggle').addEventListener('click',()=>{sidebar.classList.toggle('open');backdrop.classList.toggle('open');backdrop.hidden=!sidebar.classList.contains('open');});
  backdrop.addEventListener('click',closeMenu);
  document.getElementById('themeBtn').addEventListener('click',()=>{document.body.classList.toggle('dark');document.getElementById('themeBtn').textContent=document.body.classList.contains('dark')?'☀':'☾';});
  window.addEventListener('hashchange',()=>{
    if(location.hash.startsWith('#/')||!location.hash)render();
  });
  render();
})();








