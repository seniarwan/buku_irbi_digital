(function () {
  'use strict';
  let records=[];
  let pending;
  let enabled=false;
  function setPages(value) {
    const pages=value==='1' ? '1' : '2';
    document.documentElement.dataset.previewPages=pages;
    const control=document.querySelector('select[data-preview-pages]');
    if (control) control.value=pages;
    window.IRBI_PAGE_PREVIEW?.setPages(pages);
    schedule();
  }
  setPages(new URLSearchParams(location.search).get('pages'));
  window.addEventListener('message',event=>{
    if (event.source!==window.parent || (location.protocol!=='file:' && event.origin!==location.origin)) return;
    if (event.data?.type==='irbi-pratinjau-pages') setPages(event.data.pages);
  });

  function copyCanvases(record) {
    const left=record.left.querySelectorAll('canvas');
    const right=record.right.querySelectorAll('canvas');
    left.forEach((canvas,index)=>{
      right[index].width=canvas.width;
      right[index].height=canvas.height;
      right[index].getContext('2d').drawImage(canvas,0,0);
    });
  }

  function build() {
    const book=document.getElementById('printBook');
    if (!book || !enabled) return;
    cancelAnimationFrame(pending);
    for (const record of records) {
      record.source.hidden=false;
      record.pair.remove();
    }
    records=[];
    const tails=new Map();
    const sources=[...book.querySelectorAll('.print-chapter .atlas-card,.print-chapter figure[data-photo-spread="double"]')]
      .filter(source=>source.matches('figure') || document.documentElement.dataset.mapSpread==='double');
    for (const source of sources) {
      const chapter=source.closest('.print-chapter');
      const page=IRBI_DATA.pages[chapter.id.replace('cetak-','')];
      const pair=document.createElement('div');
      pair.className='spread-pair';
      const left=document.createElement('section');
      left.className='spread-page spread-left reading-body report-view';
      const wide=document.createElement('div');
      wide.className='spread-wide';
      const clone=source.cloneNode(true);
      clone.hidden=false;
      clone.removeAttribute('style');
      clone.classList.remove('photo-custom-size');
      for (const node of [clone,...clone.querySelectorAll('[id],[data-book-photo]')]) {
        node.removeAttribute('id');
        node.removeAttribute('data-book-photo');
        node.removeAttribute('data-photo-spread');
      }
      wide.append(clone);
      left.append(wide);
      pair.append(left);
      const tail=tails.get(chapter) || chapter;
      tail.after(pair);
      tails.set(chapter,pair);
      if (source.matches('.atlas-card')) IRBI_READER.bindSpread(wide,page);
      const right=left.cloneNode(true);
      right.classList.remove('spread-left');
      right.classList.add('spread-right');
      pair.append(right);
      for (const [side,sheet] of [['left',left],['right',right]]) {
        const marker=document.createElement('a');
        marker.className='spread-marker';
        marker.href='https://irbi-spread.invalid/'+side+'/'+records.length;
        marker.textContent='.';
        marker.tabIndex=-1;
        sheet.append(marker);
      }
      source.hidden=true;
      const record={source,pair,left,right};
      records.push(record);
      copyCanvases(record);
    }
  }

  function schedule() {
    if (!enabled) return;
    cancelAnimationFrame(pending);
    pending=requestAnimationFrame(build);
  }
  async function finishPdf(bytes) {
    const {PDFDocument,PDFName,PDFDict}=PDFLib;
    const pdf=await PDFDocument.load(bytes);
    let pairs=0, blanks=0;
    for (let index=0;index<pdf.getPageCount();index++) {
      const page=pdf.getPage(index);
      const annotations=page.node.Annots();
      if (!annotations) continue;
      const markers=[];
      for (let i=0;i<annotations.size();i++) {
        const annotation=pdf.context.lookup(annotations.get(i),PDFDict);
        const action=annotation.lookupMaybe(PDFName.of('A'),PDFDict);
        const uri=action?.lookup(PDFName.of('URI'))?.decodeText?.();
        if (uri?.startsWith('https://irbi-spread.invalid/')) markers.push({index:i,uri,annotation});
      }
      if (markers.length) {
        const marker=markers[0].annotation.lookup(PDFName.of('Rect')).asArray().map(value=>value.asNumber());
        const ratio=(page.getHeight()-marker[1])/(page.getHeight()-.283465);
        if (ratio<.98) {
          const scale=1/ratio, offset=page.getHeight()*(1-scale);
          page.scaleContent(scale,scale);
          page.translateContent(0,offset);
          for (let i=0;i<annotations.size();i++) {
            const annotation=pdf.context.lookup(annotations.get(i),PDFDict);
            const rect=annotation.lookupMaybe(PDFName.of('Rect'),PDFLib.PDFArray);
            if (rect) {
              const values=rect.asArray().map(value=>value.asNumber());
              annotation.set(PDFName.of('Rect'),pdf.context.obj([
                values[0]*scale,values[1]*scale+offset,values[2]*scale,values[3]*scale+offset
              ]));
            }
          }
        }
      }
      if (markers.some(marker=>marker.uri.includes('/left/'))) {
        pairs++;
        if (index%2===0) {
          pdf.insertPage(index,[page.getWidth(),page.getHeight()]);
          index++;
          blanks++;
        }
      }
      for (const marker of markers.reverse()) annotations.remove(marker.index);
    }
    if (!pairs) throw new Error('PDF ini belum memuat bentangan. Pilih PDF yang diekspor dengan opsi dua halaman menyambung.');
    pdf.catalog.set(PDFName.of('PageLayout'),PDFName.of('TwoPageRight'));
    return {bytes:await pdf.save(),pairs,blanks};
  }
  function wirePdfInput(input) {
    input.addEventListener('change',async()=>{
      const file=input.files[0];
      if (!file) return;
      const status=input.parentElement.parentElement.querySelector('[data-spread-status]');
      input.disabled=true;
      try {
        status.textContent='Menyusun pasangan halaman…';
        const result=await finishPdf(await file.arrayBuffer());
        const url=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));
        const link=document.createElement('a');
        link.href=url;
        link.download=file.name.replace(/\.pdf$/i,'')+'-berpasangan.pdf';
        link.click();
        setTimeout(()=>URL.revokeObjectURL(url),30000);
        status.textContent=result.pairs+' bentangan siap, '+result.blanks+' halaman kosong ditambahkan untuk pasangan kiri–kanan.';
      } catch (error) { status.textContent=error.message; }
      finally { input.disabled=false;input.value=''; }
    });
  }
  document.querySelectorAll('[data-spread-pdf]').forEach(wirePdfInput);
  window.addEventListener('irbi-layout',schedule);
  window.addEventListener('irbi-photos',schedule);
  window.addEventListener('beforeprint',()=>{
    if (enabled) build();
    for (const record of records) copyCanvases(record);
  });
  window.IRBI_SPREADS={
    prepare() {
      enabled=true;build();
      const display=document.createElement('label');
      display.innerHTML='Tampilan <select data-preview-pages><option value="1">1 halaman</option><option value="2">2 halaman berdampingan</option></select>';
      const control=display.querySelector('select');
      control.value=document.documentElement.dataset.previewPages;
      control.addEventListener('change',()=>setPages(control.value));
      document.querySelector('.print-toolbar').append(display);
      window.IRBI_PAGE_PREVIEW?.prepare();
    },
    refresh:build,finishPdf
  };
})();
