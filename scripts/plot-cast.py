import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
for id in ['H01','H02','H03','H04','H05','H08','P01']:
 p=np.array(json.loads(Path(f'artifacts/{id.lower()}/vertices.json').read_text()));fig,ax=plt.subplots(1,3,figsize=(16,7))
 for a,(i,j) in zip(ax,[(0,2),(1,2),(0,1)]):
  a.scatter(p[:,i],p[:,j],c=p[:,3-i-j],s=.8);a.set_aspect('equal');a.grid();a.set_xlabel('XYZ'[i]);a.set_ylabel('XYZ'[j]);a.set_xticks(np.arange(-1.4,1.5,.1));a.set_yticks(np.arange(0,2.1,.1) if j==2 else np.arange(-.7,.8,.1));a.tick_params(axis='x',rotation=90)
 fig.suptitle(id);fig.tight_layout();fig.savefig(f'artifacts/{id.lower()}/landmarks.png',dpi=110);plt.close(fig)
