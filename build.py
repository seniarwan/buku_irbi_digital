"""Build the offline reader from the editable IRBI narrative, tables, and boundaries."""
import csv
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'sumber'

def read_json(name):
    return json.loads((SOURCE / name).read_text(encoding='utf-8-sig'))

def read_table(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        header, *rows = csv.reader(stream, delimiter=';')
    return {'header': header, 'rows': rows}

def read_ikd(path, year):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        selected = [row for row in csv.DictReader(stream)
                    if row['tahun'] == year and row['tingkat'] == 'kabupaten']
    if not selected:
        raise ValueError(f"No district IKD rows for {year}")
    rows = []
    for i, row in enumerate(sorted(selected, key=lambda item:item['id_wilayah']), 1):
        value = row['indeks_kab'].strip()
        category = row['tingkat_kapasitas'].strip()
        if not 0 <= Decimal(value) <= 1 or category not in {'TINGGI', 'SEDANG', 'RENDAH'}:
            raise ValueError(f"Invalid IKD value or class for {row['id_wilayah']}")
        rows.append([str(i), row['nama_wilayah'].strip(), row['nama_provinsi'].strip(),
                     value.replace('.',','), category, year, row['id_wilayah'].strip()])
    return {'header':['No.','Kabupaten/Kota','Provinsi','Indeks IKD','Kelas kapasitas','Tahun','Kode wilayah'],
            'rows':rows}

def polygons(geometry):
    if geometry['type'] == 'Polygon':
        return [geometry['coordinates']]
    if geometry['type'] == 'MultiPolygon':
        return geometry['coordinates']
    raise ValueError(f"Unsupported geometry: {geometry['type']}")

def simplify_ring(ring, tolerance=0.001):
    points = [(round(point[0], 5), round(point[1], 5)) for point in ring]
    keep = {0, len(points)-1}
    pending = [(0, len(points)-1)]
    while pending:
        first, last = pending.pop()
        ax, ay = points[first]
        bx, by = points[last]
        dx, dy = bx-ax, by-ay
        length = dx*dx+dy*dy
        furthest, distance = first, tolerance*tolerance
        for index in range(first+1, last):
            x, y = points[index]
            ratio = max(0, min(1, ((x-ax)*dx+(y-ay)*dy)/length)) if length else 0
            squared = (x-ax-ratio*dx)**2+(y-ay-ratio*dy)**2
            if squared > distance:
                furthest, distance = index, squared
        if furthest != first:
            keep.add(furthest)
            pending.extend([(first, furthest), (furthest, last)])
    result = [points[index] for index in sorted(keep)]
    return result if len(result) >= 4 else points

def bounds_data(features, code_field):
    shapes = {}
    for feature in features:
        rings = polygons(feature['geometry'])
        coordinates = [[simplify_ring(ring) for ring in polygon] for polygon in rings]
        code = str(feature['properties'][code_field])
        shapes.setdefault(code, []).extend(coordinates)
    return shapes

data = {
    'pages': read_json('narasi.json'),
    'tables': {path.stem: read_table(path) for path in sorted((SOURCE/'data').glob('*.csv'))},
    'shapes': bounds_data(read_json('batas_kabkota.geojson')['features'], 'kode_kab_s'),
    'provinceShapes': bounds_data(read_json('batas_provinsi.geojson')['features'], 'kode_prop_'),
    'capitals': read_json('ibukota-provinsi.json'),
    'islandInsets': read_json('inset-pulau.json')
}

province_codes = {row[1].upper(): row[-1] for row in data['tables']['indeks-provinsi']['rows']}
province_codes['DAERAH KHUSUS IBUKOTA JAKARTA'] = '31'
data['provinceLines'] = []
for feature in read_json('batas_garis_provinsi.geojson')['features']:
    geometry = feature['geometry']
    lines = geometry['coordinates'] if geometry['type'] == 'MultiLineString' else [geometry['coordinates']]
    codes = [province_codes[feature['properties'][field].upper()] for field in ['WAPRO1','WAPRO2']]
    data['provinceLines'].append({'codes':codes, 'lines':[simplify_ring(line) for line in lines]})

ikd_page = data['pages']['analisis-data']
ikd_snapshot = ikd_page['ikd']['snapshot']
data['tables'][ikd_page['dataset']] = read_ikd(SOURCE / ikd_snapshot['berkas'], ikd_snapshot['tahun'])

geometry_codes = data['shapes'].keys()
latest = {}
unmatched = set()
with (SOURCE / ikd_snapshot['berkas']).open(encoding='utf-8-sig', newline='') as stream:
    for record in csv.DictReader(stream):
        if record['tingkat'] != 'kabupaten' or int(record['tahun']) > int(ikd_snapshot['tahun']):
            continue
        code, year = record['id_wilayah'].strip(), int(record['tahun'])
        if code in geometry_codes:
            latest[code] = max(latest.get(code, 0), year)
        else:
            unmatched.add(code)
ikd_snapshot['status'] = {'terakhir':latest, 'tanpaPadanan':sorted(unmatched)}

for key, table in data['tables'].items():
    codes = [row[-1] for row in table['rows']]
    if len(codes) != len(set(codes)):
        raise ValueError(f"Duplicate regional code in {key}")
    if key != 'indeks-provinsi' and (missing := set(codes) - geometry_codes):
        raise ValueError(f"Regional codes absent from geometry in {key}: {missing}")

target = ROOT / 'assets' / 'irbi-data.js'
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
target.write_text('const IRBI_DATA = ' + payload + ';\n', encoding='utf-8')
