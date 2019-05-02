var renderer,
  raycaster,
  scene,
  camera,
  grid,
  plane,
  model,
  controls;

var mouse = new THREE.Vector2();

const OFFSETX = 412451 
const OFFSETY = 4265844
const OFFSETZ = 2171


init();

const R2D = (r) => r * 180 / Math.PI

function ecef_to_lla(x, y, z) {
    const WGS84_A = 6378137.0      // major axis
    const WGS84_B = 6356752.314245 // minor axis
    const WGS84_E = 0.0818191908   // first eccentricity

    const b = Math.sqrt(WGS84_A*WGS84_A*(1-WGS84_E*WGS84_E))
    const ep = Math.sqrt((WGS84_A*WGS84_A-b*b)/(b*b))
    const p = Math.hypot(x, y)
    const th = Math.atan2(WGS84_A*z,b*p)
    const lon = Math.atan2(y,x)
    const lat = Math.atan2((z+ep*ep*b* Math.pow(Math.sin(th),3)),(p-WGS84_E*WGS84_E*WGS84_A*Math.pow(Math.cos(th),3)))
    const N = WGS84_A/Math.sqrt(1-WGS84_E*WGS84_E*Math.sin(lat)*Math.sin(lat))
    const alt = p/Math.cos(lat)-N
    return [R2D(lon), R2D(lat), alt]
}

function ll_to_utm(x,y) {
  const source = ('+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees +no_defs');
  const dest = ("+proj=utm +zone=13 +ellps=GRS80 +datum=nad83 +units=m +no_defs");
  return proj4(source, dest, [x,y]);
}

async function init() {

  // Setup scene
  scene = new THREE.Scene();

  raycaster = new THREE.Raycaster();
  raycaster.precision = 0.01;

  // Setup camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100000);
  camera.up = new THREE.Vector3(0,0,1);  
  camera.position.z = 100;
  camera.lookAt(new THREE.Vector3(0,0,0))
  
  //Setup renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor( 0x202020, 0.0);
  renderer.sortObjects = false;

  controls = new THREE.MapControls(camera, renderer.domElement);
  controls.addEventListener('change', render);

  const raw = await fetch('./lidar_ecef.csv').then(response => response.text())
  const points = new THREE.Geometry();
  raw.split('\n').forEach( (line, i) => {
    const p = line.trim().split(',').map( j => parseFloat(j))
    if (!isNaN(p[0])) {
      const lla = ecef_to_lla(p[0], p[1], p[2])
      const [x, y] = ll_to_utm(lla[0], lla[1])
      points.vertices.push(new THREE.Vector3(x - OFFSETX, y - OFFSETY, lla[2] - OFFSETZ));
    }
  })
  model = new THREE.Points(points, new THREE.PointsMaterial( { color: 0x888888, size: 0.11 }));
  scene.add(model);


  const sfm_points = new THREE.Geometry();
  const sfm = await fetch('./sfm-geo1.ply').then(response => response.text())
  sfm.split('\n').forEach( (line, i) => {
    if (i > 10 ) {
      const p = line.split(' ').map( j => parseFloat(j))
      if (!isNaN(p[0])) {
        const lla = ecef_to_lla(p[0], p[1], p[2])
        const [x, y] = ll_to_utm(lla[0], lla[1])
        const color = new THREE.Color();
        color.setRGB(p[3] / 255.0, p[4] / 255.0, p[5] / 255.0)
        sfm_points.vertices.push(new THREE.Vector3(x - OFFSETX, y - OFFSETY, lla[2] - (OFFSETZ - 3.5)));
        sfm_points.colors.push(color);
      }
    }
  })
  sfm_model = new THREE.Points(sfm_points, new THREE.PointsMaterial( { vertexColors: THREE.VertexColors, size: 0.15 }));
  scene.add(sfm_model);

  var planeW = 25; // pixels
  var planeH = 25; // pixels 
  var numW = 25; // how many wide (50*50 = 2500 pixels wide)
  var numH = 25; // how many tall (50*50 = 2500 pixels tall)
  plane = new THREE.Mesh(
    new THREE.PlaneGeometry( planeW*numW, planeH*numH, planeW, planeH ),
    new THREE.MeshBasicMaterial( {
        color: 0x203020,
        wireframe: true
    } )
  );
  //plane.position.x = 100
  //plane.position.y = 100
  scene.add(plane);

  document.body.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, false);
  renderer.domElement.addEventListener('mousemove', onMouseMove, false);
  renderer.domElement.addEventListener('mousedown', onMouseDown, false);

  render()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update(); 
  render();
}

function onMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(event) {
  event.preventDefault();
  var vector = new THREE.Vector3(mouse.x, mouse.y, 1).unproject(camera);
  raycaster.set(camera.position, vector.sub(camera.position).normalize());
  //var intersects = raycaster.intersectObjects([model], true);
  /*intersects.forEach( i => {
    //i.object.color = 0xff00f0
    //console.log(i)
    //i.object.material.color.setHex( 0xffff00 );
    var newColor = new THREE.Color();
    newColor.setRGB( 1, 0, 0 );

    var index = i.index;
    console.log(index)
    model.geometry.colors[index] = newColor;
    model.geometry.colorsNeedUpdate = true;
  })
  render()
  */
}

function render() {
  renderer.render(scene, camera);
  //controls.update(); 
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
