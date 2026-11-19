(function () {
  'use strict';
  const form=document.getElementById('styleForm');
  const status=document.getElementById('styleStatus');
  const preview=document.getElementById('stylePreview');
  const mode=document.getElementById('previewMode');
  const page=document.getElementById('previewPage');
  const pages=document.getElementById('previewPages');
  let draft=IRBI_STYLE.load();
  let dirty=false;
  function selectPreset(preset) {
    const paper=draft || IRBI_STYLE.defaults;
    setDraft({...preset,columns:IRBI_STYLE.presetColumns(preset.layout),
      paperSize:paper.paperSize,paperWidth:paper.paperWidth,paperHeight:paper.paperHeight,mapSpread:paper.mapSpread});
  }

  function paperFields() {
    const custom=form.elements.paperSize.value==='custom';
    document.getElementById('customPaperSize').hidden=!custom;
    form.elements.paperWidth.disabled=!custom;
    form.elements.paperHeight.disabled=!custom;
  }
  function fill() {
    for (const [name,value] of Object.entries(draft || IRBI_STYLE.defaults)) form.elements[name].value=value;
    paperFields();
  }
  function sendPreview() {
    preview.contentWindow?.postMessage({type:'irbi-pratinjau-gaya',settings:draft},
      location.protocol==='file:'?'*':location.origin);
    preview.contentWindow?.postMessage({type:'irbi-pratinjau-pages',pages:pages.value},
      location.protocol==='file:'?'*':location.origin);
  }
  function loadPreview() {
    const route=encodeURIComponent(page.value);
    preview.src=mode.value==='print'
      ? 'index.html?pratinjau-gaya=1&pratinjau=1&pages='+pages.value+'&bab='+route
      : 'index.html?pratinjau-gaya=1#/'+route;
  }
  function changed() {
    dirty=true;
    status.textContent='Pratinjau diperbarui. Perubahan belum disimpan.';
    if (draft && IRBI_STYLE.contrast(draft.ink,draft.paper)<4.5) {
      status.textContent+=' Kontras teks dan latar kurang dari 4,5:1.';
    }
    sendPreview();
  }
  function setDraft(value) {
    draft=value;
    fill();
    changed();
  }

  form.addEventListener('input',event=>{
    paperFields();
    if (!Object.hasOwn(IRBI_STYLE.defaults,event.target.name) || !form.checkValidity()) return;
    if (event.target.name==='layout') form.elements.columns.value=IRBI_STYLE.presetColumns(event.target.value);
    draft=IRBI_STYLE.normalize({...draft,...Object.fromEntries(new FormData(form))});
    changed();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    try {
      IRBI_STYLE.save(draft);
      dirty=false;
      status.textContent=draft?'Gaya tersimpan di peramban ini.':'Gaya bawaan dipulihkan.';
      sendPreview();
    } catch (_) {
      status.textContent='Peramban tidak dapat menyimpan gaya. Unduh JSON untuk menyimpan pengaturan.';
    }
  });
  document.getElementById('styleEdisiData').addEventListener('click',()=>selectPreset(IRBI_STYLE.edisiData));
  document.getElementById('styleJurnal').addEventListener('click',()=>selectPreset(IRBI_STYLE.jurnal));
  document.getElementById('styleRenduk').addEventListener('click',()=>selectPreset(IRBI_STYLE.renduk));
  document.getElementById('styleReset').addEventListener('click',()=>setDraft(null));
  document.getElementById('styleDownload').addEventListener('click',()=>{
    const file=new Blob([JSON.stringify({versi:1,gaya:draft},null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(file);
    const link=document.createElement('a');
    link.href=url;
    link.download='gaya-buku-irbi.json';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.getElementById('styleUpload').addEventListener('change',async event=>{
    const input=event.target;
    try {
      const file=input.files[0];
      if (!file) return;
      if (file.size>10000) throw new Error('File terlalu besar');
      const settings=JSON.parse(await file.text());
      if (settings?.versi!==1 || !Object.hasOwn(settings,'gaya')) throw new Error('Format tidak dikenal');
      const parsed=IRBI_STYLE.normalize(settings.gaya);
      if (settings.gaya!==null && !parsed) throw new Error('Format tidak dikenal');
      setDraft(parsed);
    } catch (_) {
      status.textContent='Berkas tidak dapat dibaca sebagai gaya IRBI tahap 1.';
    } finally {
      input.value='';
    }
  });
  window.addEventListener('beforeunload',event=>{
    if (!dirty) return;
    event.preventDefault();
    event.returnValue='';
  });
  preview.addEventListener('load',sendPreview);
  mode.addEventListener('change',loadPreview);
  pages.addEventListener('change',()=>{
    if (mode.value!=='print') {mode.value='print';loadPreview();}
    else preview.contentWindow?.postMessage({type:'irbi-pratinjau-pages',pages:pages.value},
      location.protocol==='file:'?'*':location.origin);
  });
  page.addEventListener('change',loadPreview);
  const preset=new URLSearchParams(location.search).get('preset');
  if (preset==='edisi-data') selectPreset(IRBI_STYLE.edisiData);
  else if (preset==='jurnal') selectPreset(IRBI_STYLE.jurnal);
  else if (preset==='renduk') selectPreset(IRBI_STYLE.renduk);
  else fill();
  loadPreview();
})();


