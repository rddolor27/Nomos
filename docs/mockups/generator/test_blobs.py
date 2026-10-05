from PIL import Image
from blobs import Blob
from pix import upscale
bg=(115,173,40,255)
rows=[Blob('citizen'),Blob('police'),Blob('merchant'),Blob('citizen','scarf'),Blob('citizen','bag'),Blob('citizen','hat'),Blob('citizen','beanie')]
cols=[('down',''),('down','walk'),('up',''),('up','walk'),('left',''),('left','walk'),('right','walk'),('left','sneak'),('down','sit')]
cw,ch=24,26
sheet=Image.new('RGBA',(cw*len(cols)+4,ch*len(rows)+4),bg)
for j,b in enumerate(rows):
    for i,(d,p) in enumerate(cols):
        im=b.sprite(d,p,loot=(p=='sneak'))
        sheet.alpha_composite(im,(2+i*cw,2+j*ch))
upscale(sheet,4).save('view/blobs_test.png')
print(sheet.size)
