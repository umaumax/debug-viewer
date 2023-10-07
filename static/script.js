import * as THREE from "three";
import {
    OrbitControls
} from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();

const fov = 75.0
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.0;
camera.position.x = 1.0;
camera.position.z = 1.0;
camera.lookAt(scene.position);

const canvas = document.getElementById('canvas')
const canvasContainer = document.getElementById('canvas-container')
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

function updateCanvas() {
    const ratio = 16.0 / 9.0
    var canvasWidth = canvasContainer.offsetWidth;
    var canvasHeight = canvasWidth / ratio;
    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight);
}
updateCanvas()
canvasContainer.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    updateCanvas()
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)
const pointLight = new THREE.PointLight(0xFFFFFF, 2, 50, 1.0);
scene.add(pointLight);

class ObjectListMap {
    constructor() {
        this.map = new Map();
    }

    addObjectWithLabel(object, label) {
        if (!this.map.has(label)) {
            this.map.set(label, []);
        }
        this.map.get(label).push(object);
    }

    getObjectsByLabel(label) {
        return this.map.get(label) || [];
    }

    hasObjectWithLabel(label) {
        return this.map.has(label);
    }
}
const objectListMap = new ObjectListMap();

function ToVertices(geometry) {
    const positions = geometry.attributes.position;
    const vertices = [];
    for (let index = 0; index < positions.count; index++) {
        vertices.push(
            new THREE.Vector3(
                positions.getX(index),
                positions.getY(index),
                positions.getZ(index)
            )
        );
    }
    return vertices;
}

/**
 * Add a new point to a Three.js Line object.
 * @param {THREE.Line} line - The Line object to which the point will be added.
 * @param {number} newX - The X-coordinate of the new point.
 * @param {number} newY - The Y-coordinate of the new point.
 * @param {number} newZ - The Z-coordinate of the new point.
 * @param {THREE.Material} material - The material for the Line object.
 * @param {THREE.Scene} scene - The Three.js scene.
 */
function addPointToLine(line, newX, newY, newZ, material, scene) {
    // Create a new geometry with the updated vertices
    var points = ToVertices(line.geometry)
    points.push(new THREE.Vector3(newX, newY, newZ))
    const newGeometry = new THREE.BufferGeometry().setFromPoints(points);

    const newLine = new THREE.Line(newGeometry, material);

    // Remove the old Line object from the scene and add the new one
    scene.remove(line);
    scene.add(newLine);

    return newLine;
}

class CustomLine {
    constructor(scene, material) {
        this.scene = scene;
        this.points = []
        this.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        this.material = material
        this.line = new THREE.Line(this.geometry, material);
        this.addToScene();
    }

    // for debug
    generatePoints() {
        const points = [];
        for (let i = 0; i < 100; i++) {
            const x = (i - 50) * 0.1;
            const y = Math.sin(x);
            const z = 0;
            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    }

    addToScene() {
        this.scene.add(this.line);
    }

    updateByJsonData(data) {
        const values = data['data']
        const position = new THREE.Vector3(values['position.x'], values['position.y'], values['position.z'])
        this.line = addPointToLine(this.line, position.x, position.y, position.z, this.line.material, this.scene)
    }

    update() {}
}
const line = new CustomLine(scene, new THREE.LineBasicMaterial({
    color: 0x005500
}))

class CustomSphere {
    constructor(scene, material) {
        this.scene = scene;
        this.spheres = [];
        this.material = material
        this.addToScene();
    }

    // for debug
    generateSpheres() {
        for (let i = 0; i < 100; i++) {
            const x = (i - 50) * 0.1;
            const y = Math.sin(x);
            const z = 0;
            const sphereGeometry = new THREE.SphereGeometry(0.02, 16, 16);
            const sphere = new THREE.Mesh(sphereGeometry, this.material);
            sphere.position.set(x, y, z);
            this.spheres.push(sphere);
        }
    }

    addToScene() {
        this.spheres.forEach((sphere) => {
            this.scene.add(sphere);
        });
    }

    updateByJsonData(data) {
        const values = data['data']
        const position = new THREE.Vector3(values['position.x'], values['position.y'], values['position.z']);
        const radius = 0.01
        const widthSegments = 4
        const heightSegments = 4
        const sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
        const sphere = new THREE.Mesh(sphereGeometry, this.material);
        sphere.position.copy(position);
        this.scene.add(sphere);
    }

    update() {}
}

const points = new CustomSphere(scene, new THREE.MeshLambertMaterial({
    color: 0x00ff00
}));

function createViewCone(material) {
    const TILE_SIZE = 0.2
    var geometry = new THREE.CylinderGeometry(1, TILE_SIZE * 3, TILE_SIZE * 3, 4);
    geometry.rotateY(Math.PI / 4);
    var cylinder = new THREE.Mesh(geometry, material);
    cylinder.scale.set(0.2, 0.2, 0.1)
    return cylinder;
}

class ViewCones {
    constructor(scene, material) {
        this.scene = scene;
        this.material = material
        this.i = 0
    }

    updateByJsonData(data) {
        const values = data['data']
        const position = new THREE.Vector3(values['position.x'], values['position.y'], values['position.z']);
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().set(values['rotation.x'], values['rotation.y'], values['rotation.z'], values['rotation.w']));
        this.i += 1

        if (this.i % 50 > 0) {
            return
        }

        const viewCone = createViewCone(this.material);
        viewCone.position.copy(position);
        viewCone.rotation.copy(rotation);
        viewCone.rotateX(-Math.PI / 2);
        this.scene.add(viewCone);
    }

    update() {}
}
const viewCones = new ViewCones(scene, new THREE.MeshBasicMaterial({
    color: 0xffff00,
    wireframe: true
}));

class CustomArrow {
    constructor(scene, color) {
        this.scene = scene;

        const direction = new THREE.Vector3(1, 0, 0);
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);

        this.length = 0.5;
        this.color = color || 0xffffff;

        this.arrowX = new THREE.ArrowHelper(direction, this.position, this.length, 0xff0000);
        this.arrowY = new THREE.ArrowHelper(direction, this.position, this.length, 0x00ff00);
        this.arrowZ = new THREE.ArrowHelper(direction, this.position, this.length, 0x0000ff);
        scene.add(this.arrowX);
        scene.add(this.arrowY);
        scene.add(this.arrowZ);

        const geometry = new THREE.BoxGeometry(0.25, 0.1, 0.02);
        const material = new THREE.MeshBasicMaterial({
            color: 0xdddddd
        });
        this.body = new THREE.Mesh(geometry, material);
        scene.add(this.body);
    }

    updateByJsonData(data) {
        const values = data['data']
        const position = new THREE.Vector3(values['position.x'], values['position.y'], values['position.z'])
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().set(values['rotation.x'], values['rotation.y'], values['rotation.z'], values['rotation.w']));
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.update()
    }

    update() {
        this.arrowX.position.copy(this.position);
        this.arrowY.position.copy(this.position);
        this.arrowZ.position.copy(this.position);
        this.body.position.copy(this.position)

        const directionVectorX = new THREE.Vector3(1, 0, 0);
        directionVectorX.applyEuler(this.rotation);
        this.arrowX.setDirection(directionVectorX);

        const directionVectorY = new THREE.Vector3(0, 1, 0);
        directionVectorY.applyEuler(this.rotation);
        this.arrowY.setDirection(directionVectorY);

        const directionVectorZ = new THREE.Vector3(0, 0, 1);
        directionVectorZ.applyEuler(this.rotation);
        this.arrowZ.setDirection(directionVectorZ);

        this.body.rotation.copy(this.rotation)
    }
}

const customArrow = new CustomArrow(scene);
objectListMap.addObjectWithLabel(customArrow, "Sample pose")
objectListMap.addObjectWithLabel(line, "Sample pose")
objectListMap.addObjectWithLabel(points, "Sample pose")
objectListMap.addObjectWithLabel(viewCones, "Sample pose")

function setAxis(scene) {
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
    const xAxisMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000 // X:Red
    });
    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    scene.add(xAxisLine);

    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]);
    const yAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00 // Y:Green
    });
    const yAxisLine = new THREE.Line(yAxisGeometry, yAxisMaterial);
    scene.add(yAxisLine);

    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)]);
    const zAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x0000ff // Z:Blue
    });
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    scene.add(zAxisLine);
}
setAxis(scene)

const animate = () => {
    requestAnimationFrame(animate);
    // required if controls.enableDamping or controls.autoRotate are set to true
    controls.update();
    renderer.render(scene, camera);
};
animate();

function initUiControl(canvas) {
    canvas.addEventListener("keydown", function(e) {
        console.log("keydown:", e.key)
        if (e.key == 'r') {
            console.log("reset")
            controls.reset()
        }
    }, false);
    return
}
initUiControl(canvas)

// connection to the server
const host = window.location.hostname
const port = 8765
// const path = 'ws/get/dummy'
const path = 'ws/get/database'
const url = 'ws://' + host + ':' + port + '/' + path
const socket = new WebSocket(url);

socket.addEventListener('open', (event) => {
    console.log('connection opened');

    const queryData = {
        group: 'session-test',
        timestamp: '12345'
    };

    socket.send(JSON.stringify(queryData));
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('received data:', data);

    const timestamp = data.timestamp;
    const group = data.group;
    const sequentialId = data.sequentialId;
    const label = data.label;
    if (!objectListMap.hasObjectWithLabel(label)) {
        console.log('label skipped:', label);
        return;
    }
    const objects = objectListMap.getObjectsByLabel(label)
    objects.forEach(function(object) {
        object.updateByJsonData(data)
    });

    const timestampInput = document.getElementById('timestamp');
    timestampInput.value = timestamp;
});

socket.addEventListener('close', (event) => {
    console.log(`connection closed code: ${event.code} reason: ${event.reason}`);
});

socket.addEventListener('error', (error) => {
    console.error('connection error:', error);
});
