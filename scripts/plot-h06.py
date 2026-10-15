import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=np.array(json.load(open('artifacts/h06/vertices.json')));p*=2.02/(p[:,2].max()-p[:,2].min())
fig,ax=plt.subplots(1,2,figsize=(16,8));ax[0].scatter(p[:,0],p[:,2],c=p[:,1],s=.5);ax[1].scatter(p[:,1],p[:,2],c=p[:,0],s=.5)
for a in ax:a.set_aspect('equal');a.grid();a.set_yticks(np.arange(0,2.1,.1))
ax[0].set_xticks(np.arange(-1.2,1.3,.1));ax[0].tick_params(axis='x',rotation=90)
fig.savefig('artifacts/h06/landmarks.png',dpi=120)
