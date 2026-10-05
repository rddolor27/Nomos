import subprocess, os, time, json, glob, shutil, sys
import numpy as np
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
T='/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/perf-load/tools'
OXI=T+'/cargo/bin/oxipng'; ZOP=T+'/zopfli-src/zopflipng'; PQ=T+'/pngquant-src/target/release/pngquant'; CW=T+'/libwebp-build/cwebp'
inputs = sorted(glob.glob('/home/user/reports/mockups/*.png'))+sorted(glob.glob('/home/user/reports/mockups/previews/*.png'))+['src/ninja_tileset.png','src/atlas2048_raw.png']
os.makedirs('out',exist_ok=True)
def rgba(p):
    return np.asarray(Image.open(p).convert('RGBA')).astype(np.int16)
def same(a,b):
    if a.shape!=b.shape: return False
    va=a[...,3]>0; vb=b[...,3]>0
    if not np.array_equal(a[...,3],b[...,3]): return False
    return bool(np.array_equal(a[va][:, :3], b[va][:, :3]))
def maxdiff(a,b):
    return int(np.abs(a-b).max())
def run(cmd, timeout=900):
    t0=time.time(); r=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout); return time.time()-t0, r
def process(src):
    name=os.path.splitext(os.path.basename(src))[0]; res={'file':os.path.basename(src),'orig':os.path.getsize(src)}
    ref=rgba(src); im=Image.open(src); res['dims']=im.size
    res['colors']=len(np.unique(np.asarray(im.convert('RGBA')).reshape(-1,4).view(np.uint32)))
    variants={}
    o=f'out/{name}.oxipng.png'; dt,r=run([OXI,'-o','max','--strip','safe','--alpha','--out',o,src]); variants['oxipng -o max']=(o,dt)
    o=f'out/{name}.oxiZ.png'; dt,r=run([OXI,'-o','max','-Z','--strip','safe','--alpha','--out',o,src]); variants['oxipng -o max -Z (zopfli)']=(o,dt)
    o=f'out/{name}.zopflipng.png'; dt,r=run([ZOP,'-m','-y',src,o]); variants['zopflipng -m']=(o,dt)
    o=f'out/{name}.pq.png'; dt,r=run([PQ,'--speed','1','--strip','--force','--output',o,'256',src])
    if os.path.exists(o):
        o2=f'out/{name}.pq.oxi.png'; dt2,r=run([OXI,'-o','max','--strip','safe','--out',o2,o]); variants['pngquant 256 + oxipng']=(o2,dt+dt2)
    o=f'out/{name}.webp'; dt,r=run([CW,'-lossless','-z','9','-metadata','none','-quiet',src,'-o',o]); variants['cwebp -lossless -z 9']=(o,dt)
    o=f'out/{name}.sharp.avif'; dt,r=run(['node','sharp_enc.mjs',src,o,'avif']); variants['AVIF lossless (sharp effort 9)']=(o,dt)
    o=f'out/{name}.pil444.avif'; t0=time.time(); Image.open(src).convert('RGBA').save(o,quality=100,subsampling='4:4:4',speed=0); variants['AVIF q100 4:4:4 (Pillow)']=(o,time.time()-t0)
    res['variants']={}
    for k,(p,dt) in variants.items():
        if not os.path.exists(p): res['variants'][k]=None; continue
        d=rgba(p); res['variants'][k]={'bytes':os.path.getsize(p),'enc_s':round(dt,2),'exact':same(ref,d),'maxdiff':maxdiff(ref,d) if d.shape==ref.shape else None}
    return res
with ThreadPoolExecutor(4) as ex:
    results=list(ex.map(process, inputs))
json.dump(results, open('asset_results.json','w'), indent=1)
for r in results:
    print(f"\n{r['file']} {r['dims']} colors={r['colors']} orig={r['orig']}")
    for k,v in r['variants'].items():
        if v: print(f"   {k:34s} {v['bytes']:>9d} B ({100*v['bytes']/r['orig']:5.1f}%) enc {v['enc_s']:6.2f}s exact={v['exact']} maxdiff={v['maxdiff']}")
