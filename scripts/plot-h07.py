import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=np.array(json.load(open('artifacts/h07/vertices.json')));p*=1.96/np.ptp(p[:,2]);p[:,2]-=p[:,2].min()
fig,ax=plt.subplots(1,3,figsize=(18,8))
for a,(i,j) in zip(ax,[(1,2),(0,2),(1,0)]):
 a.scatter(p[:,i],p[:,j],c=p[:,3-i-j],s=.6);a.set_aspect('equal');a.grid();a.set_xlabel('XYZ'[i]);a.set_ylabel('XYZ'[j]);a.set_xticks(np.arange(-1.4,1.5,.1));a.tick_params(axis='x',rotation=90)
fig.savefig('artifacts/h07/native-landmarks.png',dpi=120)
