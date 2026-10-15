"""Original sparse pentatonic plucks and synthesized water/wind; no sampled music."""
from pathlib import Path
import wave
import numpy as np

OUT=Path('artifacts/promo-v1')
OUT.mkdir(parents=True,exist_ok=True)
rate=48000
duration=48
count=rate*duration
rng=np.random.default_rng(6882)
sound=np.zeros((count,2),dtype=np.float64)

def filtered_noise(low,high):
    noise=rng.normal(0,1,count)
    spectrum=np.fft.rfft(noise)
    hz=np.fft.rfftfreq(count,1/rate)
    shape=(hz/(hz+low))**2/(1+(hz/high)**4)
    output=np.fft.irfft(spectrum*shape,n=count)
    return output/(np.std(output)+1e-9)

timeline=np.arange(count)/rate
for channel in range(2):
    water=filtered_noise(350,3600)
    wind=filtered_noise(90,420)
    level=.006*(.8+.2*np.sin(timeline*.43+channel))
    # The dedicated river shot gently brings the water forward.
    river=1+.8*np.exp(-((timeline-27)/3.2)**4)
    sound[:,channel]+=water*level*river+wind*.003

def pluck(start,freq,amplitude=.055,pan=.5,length=5):
    offset=int(start*rate)
    n=min(int(length*rate),count-offset)
    if n<=0:return
    t=np.arange(n)/rate
    signal=np.zeros(n)
    for harmonic in range(1,9):
        decay=np.exp(-t*(.7+harmonic*.25))
        signal+=np.sin(2*np.pi*freq*harmonic*t+.003*np.sin(t*4))*decay/(harmonic**1.65)
    signal*=np.minimum(1,t/.012)*amplitude
    gains=[np.sqrt(1-pan),np.sqrt(pan)]
    for delay,volume in [(0,1),(.17,.20),(.39,.15),(.71,.11),(1.13,.08),(1.61,.05)]:
        at=offset+int(delay*rate)
        size=min(n,count-at)
        if size>0:
            for channel in range(2):sound[at:at+size,channel]+=signal[:size]*volume*gains[channel if delay==0 else 1-channel]

notes=[293.665,329.628,369.994,440,493.883,440,369.994,329.628,
       293.665,440,369.994,329.628,293.665,220,293.665,369.994,
       329.628,293.665,220,293.665,369.994,440,369.994,329.628,
       293.665,369.994,440,493.883,440,369.994,329.628,293.665]
for i,note in enumerate(notes):
    pluck(.65+i*1.43,note,.047+(i%4==0)*.011,.3+.4*(i%3)/2)
for start in [0.7,6.7,12.7,18.7,24.7,30.7,36.7,42.7]:
    pluck(start,146.832,.038,.45,7)
    pluck(start+.06,220,.021,.6,6)

fade=np.clip(timeline/1.8,0,1)*np.clip((duration-timeline)/2.5,0,1)
sound*=fade[:,None]
peak=np.max(np.abs(sound))
assert 0<peak<.95,peak
pcm=(np.clip(sound,-1,1)*32767).astype('<i2')
with wave.open(str(OUT/'original-ambience.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
print(f'Original 48s stereo ambience: peak {peak:.4f}, RMS {np.sqrt(np.mean(sound**2)):.4f}')
