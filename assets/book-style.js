(function () {
  'use strict';
  const key = 'irbi-daftar-gaya-v1';
  const columnKey = layout => 'irbi-daftar-gaya-kolom-'+layout;
  const defaults = Object.freeze({accent:'#145968',paper:'#fbfcfa',ink:'#102923',font:'georgia',
    title:100,body:100,columns:0,gap:6,marginX:14,marginTop:15,marginBottom:16,table:'normal',layout:'irbi',
    paperSize:'a4',paperWidth:21,paperHeight:21,mapSpread:'single'});
  const renduk = Object.freeze({...defaults,layout:'renduk',accent:'#126478',paper:'#ffffff',ink:'#12313b',
    font:'segoe',title:106,body:100,gap:7,marginX:15,marginTop:15,marginBottom:16,table:'compact'});
  const jurnal = Object.freeze({...defaults,layout:'jurnal',accent:'#2544ce',paper:'#ffffff',ink:'#171b2a',
    font:'segoe',title:112,body:105,gap:8,marginX:17,marginTop:15,marginBottom:17,table:'normal'});
  const edisiData = Object.freeze({...defaults,layout:'edisi-data',accent:'#4935a6',paper:'#fcfbf8',
    ink:'#222139',font:'segoe',title:110,body:103,gap:6,marginX:15,marginTop:14,marginBottom:16});
  const fonts = {
    georgia:"Georgia, serif",
    segoe:"'Segoe UI', Arial, sans-serif",
    times:"'Times New Roman', serif"
  };
  const ranges = {title:[80,120],body:[90,115],gap:[3,12],marginX:[10,25],marginTop:[10,25],marginBottom:[10,25]};
  function normalize(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const output = {...defaults};
    for (const field of ['accent','paper','ink']) {
      if (/^#[0-9a-f]{6}$/i.test(input[field])) output[field] = input[field].toLowerCase();
    }
    for (const [field,[min,max]] of Object.entries(ranges)) {
      const value = Number(input[field]);
      if (Number.isFinite(value)) output[field] = Math.round(Math.max(min,Math.min(max,value)));
    }
    if (Object.hasOwn(fonts,input.font)) output.font=input.font;
    const columns = Number(input.columns);
    if (Number.isInteger(columns) && columns >= 1 && columns <= 3) output.columns=columns;
    if (input.table === 'compact') output.table='compact';
    if (['renduk','jurnal','edisi-data'].includes(input.layout)) output.layout=input.layout;
    if (input.paperSize==='custom') output.paperSize='custom';
    if (input.mapSpread==='double') output.mapSpread='double';
    for (const field of ['paperWidth','paperHeight']) {
      const value=Number(input[field]);
      if (Number.isFinite(value) && value>=10 && value<=100) output[field]=Math.round(value*100)/100;
    }
    return output;
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(key))); }
    catch (_) { return null; }
  }
  function save(settings) {
    if (settings) {
      const style=normalize(settings);
      localStorage.setItem(columnKey(style.layout),String(style.columns));
      localStorage.setItem(key,JSON.stringify(style));
    } else {
      localStorage.removeItem(columnKey(defaults.layout));
      localStorage.removeItem(key);
    }
  }
  function presetColumns(layout) {
    try { return normalize({columns:localStorage.getItem(columnKey(layout))}).columns; }
    catch (_) { return defaults.columns; }
  }

  function luminance(hex) {
    const rgb=hex.slice(1).match(/../g).map(value => parseInt(value,16)/255)
      .map(value => value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  }
  function contrast(a,b) {
    const levels=[luminance(a),luminance(b)].sort((x,y)=>y-x);
    return (levels[0]+.05)/(levels[1]+.05);
  }

  function apply(settings) {
    const root=document.documentElement;
    let dynamic=document.getElementById('custom-page-margin');
    if (!settings) {
      root.removeAttribute('data-book-style');
      root.removeAttribute('data-book-layout');
      root.removeAttribute('data-book-columns');
      root.removeAttribute('data-map-spread');
      root.style.removeProperty('--book-page-width');
      root.style.removeProperty('--book-page-height');
      root.style.removeProperty('--book-page-ratio');
      root.style.removeProperty('--book-spread-ratio');
      dynamic?.remove();
      window.dispatchEvent(new Event('irbi-layout'));
      return;
    }
    root.dataset.bookStyle=settings.table;
    root.dataset.bookLayout=settings.layout;
    if (settings.columns) root.dataset.bookColumns=settings.columns;
    else root.removeAttribute('data-book-columns');
    const text=contrast(settings.accent,'#ffffff')>=4.5?'#ffffff':'#102923';
    const vars={
      accent:settings.accent,paper:settings.paper,ink:settings.ink,'accent-text':text,font:fonts[settings.font],
      'title-scale':settings.title/100,'body-scale':settings.body/100,columns:settings.columns,gap:settings.gap+'mm',
      'margin-x':settings.marginX+'mm','margin-top':settings.marginTop+'mm','margin-bottom':settings.marginBottom+'mm'
    };
    for (const [field,value] of Object.entries(vars)) root.style.setProperty('--book-custom-'+field,value);
    if (!dynamic) {
      dynamic=document.createElement('style');
      dynamic.id='custom-page-margin';
      document.head.append(dynamic);
    }
    const width=settings.paperSize==='custom' ? settings.paperWidth*10 : 210;
    const height=settings.paperSize==='custom' ? settings.paperHeight*10 : 297;
    root.style.setProperty('--book-page-width',width+'mm');
    root.style.setProperty('--book-page-height',height+'mm');
    root.style.setProperty('--book-page-ratio',width/height);
    root.style.setProperty('--book-spread-ratio',2*width/height);
    const size=width+'mm '+height+'mm';
    dynamic.textContent='@page {size: '+size+'; margin: '+settings.marginTop+'mm '+settings.marginX+'mm '+settings.marginBottom+'mm;}'+
      ' @page irbi-sampul-utuh {size: '+size+'; margin:0;}'+
      ' @page renduk-pembuka {size: '+size+'; margin:0;}'+
      ' @page irbi-spread {size: '+size+'; margin:0;}';
    root.dataset.mapSpread=settings.mapSpread;
    window.dispatchEvent(new Event('irbi-layout'));
  }

    const params = new URLSearchParams(location.search);
  const previewEdition = params.get('gaya') === 'edisi-data';
  window.IRBI_STYLE={defaults,renduk,jurnal,edisiData,normalize,load,save,presetColumns,apply,contrast};
  apply(previewEdition ? {...edisiData,columns:presetColumns(edisiData.layout)} : load());
  if (previewEdition) {
    const exportLink = document.querySelector('.export-link');
    const styleLink = document.querySelector('.style-link');
    if (exportLink) exportLink.href = '?pratinjau=1&gaya=edisi-data';
    if (styleLink) styleLink.href = 'gaya.html?preset=edisi-data';
  }
  window.addEventListener('storage',event=>{if(event.key===key && !previewEdition) apply(load());});
  if (window.parent !== window && params.has('pratinjau-gaya')) {
    window.addEventListener('message',event=>{
      if (event.source !== window.parent || (location.protocol !== 'file:' && event.origin !== location.origin)) return;
      if (event.data?.type === 'irbi-pratinjau-gaya') apply(normalize(event.data.settings));
    });
  }
})();




