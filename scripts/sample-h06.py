import subprocess
from PIL import Image,ImageDraw
for key,start,end in [('3ea4540b',2,8),('37037a6e',0,8)]:
 out=Image.new('RGB',(1600,1000),'#eee');d=ImageDraw.Draw(out)
 for i in range(20):
  t=start+(end-start)*i/20;p=f'artifacts/h06/{key}-{i:02}.jpg'
  subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(t),'-i',f'design/pasture/gemini_generated_video_{key}.mp4','-frames:v','1','-vf','scale=400:-1',p],check=True)
  im=Image.open(p);im.thumbnail((400,225));x=i%4*400;y=i//4*200;out.paste(im,(x,y));d.text((x+8,y+177),str(round(t,2)),fill='#222')
 out.save(f'artifacts/h06/{key}-timing.jpg')
