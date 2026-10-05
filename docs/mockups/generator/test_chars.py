from PIL import Image
from chars import Person, bubble, coin, HAIR
from pix import upscale
bg=(120,170,80,255)
people=[
 Person(1,'short','brown','teal','denim'),
 Person(3,'bob','black','orange','brown'),
 Person(5,'curly','dark','yellow','grey'),
 Person(2,'bun','ginger','purple','olive'),
 Person(6,'pony','black','red','denim'),
 Person(4,'short','grey','green','tan'),
 Person(2,'short','black','teal','denim',role='police'),
 Person(5,'bob','brown','teal','denim',role='police'),
 Person(3,'curly','black','white','brown',role='merchant'),
 Person(1,'pony','blonde','white','brown',role='merchant'),
]
cols=[('down',''),('down','walk'),('up',''),('up','walk'),('left',''),('left','walk'),('right','walk'),('left','sneak'),('down','sit'),('down','sleep')]
cw,ch=24,26
sheet=Image.new('RGBA',(cw*len(cols)+4, ch*len(people)+4),bg)
for j,p in enumerate(people):
    for i,(d,pose) in enumerate(cols):
        im=p.sprite(d,pose,loot=(pose=='sneak'))
        sheet.alpha_composite(im,(2+i*cw,2+j*ch))
upscale(sheet,4).save('view/chars_test.png')
b=Image.new('RGBA',(80,20),bg)
for i,ic in enumerate(['!','$','z','food','?']):
    b.alpha_composite(bubble(ic),(2+i*15,2))
b.alpha_composite(coin(),(2+5*15,4))
upscale(b,8).save('view/bubbles_test.png')
print(sheet.size)
