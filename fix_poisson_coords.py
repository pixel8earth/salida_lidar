import numpy as np
import trimesh

mesh_file = "mesh.ply"
pts_file = "pts.csv"
out_file = "msh_fixed.ply"

def scaler(pts, scale_factor=1.1):
    pt_min, pt_max = pts.min(axis=0), pts.max(axis=0)
    center = (pt_min + pt_max)/2.0
    scale = np.max(pt_max - pt_min) * scale_factor
    center = center - scale/2
    scale_tform = np.eye(4) / scale
    scale_tform[3,3] = 1
    translate_tform = np.eye(4)
    translate_tform[:-1, 3] = -center
    return scale_tform @ translate_tform


msh = trimesh.load_mesh(mesh_file)
with open(pts_file) as f:
    pts = np.asarray([[float(e) for e in row.strip().split(",")] for row in f.readlines()[1:]])[:,:3]

msh.vertices = trimesh.transform_points(msh.vertices, np.linalg.inv(scaler(pts)))
msh.export(out_file)
