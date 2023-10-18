import * as THREE from "three";
import {
    OrbitControls
} from "three/addons/controls/OrbitControls.js";
import {
    PLYLoader
} from "three/addons/loaders/PLYLoader.js";

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
});

const paramConfig = {
    group: params.group ? params.group : 'new',
    dataInterval: params.interval ? Number(params.interval) : 5,
}

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

function stringToColor(str, minLightness = 50, maxLightness = 100) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = ['#FFFF00', '#00FFFF', '#FF00FF']
    const index = hash % colors.length
    return colors[index]

    // const lightness = (hash % (maxLightness - minLightness)) + minLightness;
    //
    // const hue = (hash % 360) / 360;
    // const saturation = 1.0;
    //
    // const color = new THREE.Color();
    // color.setHSL(hue, saturation, lightness / 100);
    // return color;
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
function addPointToLine(line, newX, newY, newZ, material, scene, visible = true) {
    // Create a new geometry with the updated vertices
    var points = ToVertices(line.geometry)
    points.push(new THREE.Vector3(newX, newY, newZ))
    const newGeometry = new THREE.BufferGeometry().setFromPoints(points);

    const newLine = new THREE.Line(newGeometry, material);
    newLine.visible = visible

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
        this.visible = true
        this.line = new THREE.Line(this.geometry, material);
        this.line.visible = this.visible
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
        this.line = addPointToLine(this.line, position.x, position.y, position.z, this.line.material, this.scene, this.visible)
    }

    update() {}

    set_visible(flag) {
        this.visible = flag
        this.line.visible = flag
    }
}

class CustomSphere {
    constructor(scene, scale, material, interval = 1) {
        this.scene = scene;
        this.scale = scale
        this.spheres = [];
        this.material = material
        this.visible = true
        this.addToScene();
        this.count = 0
        this.interval = interval
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
        this.count += 1;
        // filter input data
        if (this.count % this.interval != 0) {
            return
        }

        const values = data['data']
        const position = new THREE.Vector3(values['position.x'], values['position.y'], values['position.z']);
        const radius = 0.0075 * this.scale
        const widthSegments = 4
        const heightSegments = 4
        const sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
        const sphere = new THREE.Mesh(sphereGeometry, this.material);
        sphere.position.copy(position);
        sphere.visible = this.visible
        this.spheres.push(sphere);
        this.scene.add(sphere);
    }

    update() {}

    set_visible(flag) {
        this.visible = flag
        this.spheres.forEach((obj) => obj.visible = flag)
    }
}

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
        this.visible = true
        this.objects = []
    }

    updateByJsonData(data) {
        const values = data['data']
        const position = new THREE.Vector3(values['position.x'], values['position.y'], values['position.z']);
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().set(values['rotation.x'], values['rotation.y'], values['rotation.z'], values['rotation.w']));

        this.objects.forEach((object) => {
            var hslColor = {
                h: 0,
                s: 0,
                l: 0
            };
            object.material.color.getHSL(hslColor);
            object.material.color.setHSL(hslColor.h, hslColor.s, Math.max(hslColor.l * 0.9, 0.05));
        });

        const viewCone = createViewCone(this.material.clone());
        viewCone.position.copy(position);
        viewCone.rotation.copy(rotation);
        viewCone.rotateX(-Math.PI / 2);
        this.objects.push(viewCone);
        viewCone.visible = this.visible
        this.scene.add(viewCone);
    }

    update() {}

    set_visible(flag) {
        this.visible = flag
        this.objects.forEach((obj) => obj.visible = flag)
    }
}

class CustomArrow {
    constructor(scene, color) {
        this.scene = scene;
        this.visible = true

        const direction = new THREE.Vector3(1, 0, 0);
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);

        this.length = 0.5;
        this.color = color || 0xffffff;

        this.arrowX = new THREE.ArrowHelper(direction, this.position, this.length, 0xff0000);
        this.arrowY = new THREE.ArrowHelper(direction, this.position, this.length, 0x00ff00);
        this.arrowZ = new THREE.ArrowHelper(direction, this.position, this.length, 0x0000ff);

        const geometry = new THREE.BoxGeometry(0.25, 0.1, 0.02);
        const material = new THREE.MeshBasicMaterial({
            color: 0xdddddd
        });
        this.body = new THREE.Mesh(geometry, material);

        this.objects = [this.arrowX, this.arrowY, this.arrowZ, this.body]
        this.objects.forEach((obj) => obj.visible = this.visible);
        this.objects.forEach((obj) => scene.add(obj));
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
        this.objects.forEach((obj) => obj.position.copy(this.position));

        const directionVectorX = new THREE.Vector3(1, 0, 0);
        directionVectorX.applyEuler(this.rotation);
        this.arrowX.setDirection(directionVectorX);

        const directionVectorY = new THREE.Vector3(0, 1, 0);
        directionVectorY.applyEuler(this.rotation);
        this.arrowY.setDirection(directionVectorY);

        const directionVectorZ = new THREE.Vector3(0, 0, 1);
        directionVectorZ.applyEuler(this.rotation);
        this.arrowZ.setDirection(directionVectorZ);

        this.body.rotation.copy(this.rotation);
    }

    set_visible(flag) {
        this.visible = flag;
        this.objects.forEach((obj) => obj.visible = flag);
    }
}

function setAxis(scene, length = 1.0) {
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0)]);
    const xAxisMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000 // X:Red
    });
    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    scene.add(xAxisLine);

    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0)]);
    const yAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00 // Y:Green
    });
    const yAxisLine = new THREE.Line(yAxisGeometry, yAxisMaterial);
    scene.add(yAxisLine);

    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length)]);
    const zAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x0000ff // Z:Blue
    });
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    scene.add(zAxisLine);
}
setAxis(scene, 10.0)

function createFocusPoint() {
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)]);
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)]);
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1)]);

    const xAxisMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000
    });
    const yAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00
    });
    const zAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });

    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    const yAxisLine = new THREE.Line(yAxisGeometry, yAxisMaterial);
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);

    const pointGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const pointMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF
    });
    const focusPointBox = new THREE.Mesh(pointGeometry, pointMaterial);

    const focusPoint = new THREE.Object3D();
    focusPoint.add(xAxisLine);
    focusPoint.add(yAxisLine);
    focusPoint.add(zAxisLine);
    focusPoint.add(focusPointBox);

    focusPoint.scale.set(0.1, 0.1, 0.1)
    return focusPoint
}

const focusPoint = createFocusPoint();
scene.add(focusPoint);

const customArrow = new CustomArrow(scene);
const line = new CustomLine(scene, new THREE.LineBasicMaterial({
    color: 0x005500
}))
const points = new CustomSphere(scene, 1.0, new THREE.MeshLambertMaterial({
    color: 0x00ff00
}), paramConfig.dataInterval);
objectListMap.addObjectWithLabel(customArrow, "Sample pose")
objectListMap.addObjectWithLabel(line, "Sample pose")
objectListMap.addObjectWithLabel(points, "Sample pose")

function resizePointCloudToTargetSize(geometry, targetSize) {
    const positions = geometry.attributes.position.array;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }

    const currentSizeX = maxX - minX;
    const currentSizeY = maxY - minY;
    const currentSizeZ = maxZ - minZ;

    const scaleX = targetSize / currentSizeX;
    const scaleY = targetSize / currentSizeY;
    const scaleZ = targetSize / currentSizeZ;
    const scale = Math.max(scaleX, scaleY, scaleZ)

    geometry.scale(scale, scale, scale);
    geometry.attributes.position.needsUpdate = true;
}

window.loadPlyModel = function(plyModelPath, scale = 'auto') {
    if (plyModelPath == "") return;

    console.log("start to load ply file:", plyModelPath);
    const material = new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.03,
    });
    const loader = new PLYLoader()
    loader.load(
        plyModelPath,
        function(geometry) {
            if (scale == 'auto') {
                resizePointCloudToTargetSize(geometry, 1.0)
            } else {
                geometry.scale(scale, scale, scale);
            }
            const particles = new THREE.Points(geometry, material);
            scene.add(particles);
        },
        (xhr) => {
            console.log(xhr.loaded + '/' + xhr.total + ' ' + (xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
}


var auto_mode = false;
const cameraDiff = new THREE.Vector3();
const animate = () => {
    requestAnimationFrame(animate);
    // required if controls.enableDamping or controls.autoRotate are set to true
    renderer.render(scene, camera);

    focusPoint.position.copy(controls.target)

    const targetPoint = customArrow.body.position
    if (auto_mode) {
        camera.position.copy(targetPoint.clone().add(cameraDiff))
        camera.lookAt(targetPoint);
    } else {
        controls.update();
    }
};
animate();

function initUiControl(canvas) {
    canvas.addEventListener("keydown", function(e) {
        console.log("keydown:", e.key)
        if (e.key == 'r') {
            console.log("reset")
            controls.reset()
        }
        if (e.key == 'a') {
            console.log("switch auto mode and manual mode")
            auto_mode = !auto_mode
            const targetPoint = customArrow.body.position
            const info = document.getElementById('info')
            if (auto_mode) {
                info.innerHTML = "Mode: auto"
                cameraDiff.copy(controls.object.position.clone().sub(controls.target))
                console.log("cameraDiff:", cameraDiff, controls.object.position, controls.target)

                controls.enabled = false
            } else {
                info.innerHTML = "Mode: manual"
                controls.object.position.copy(camera.position)
                controls.target.copy(targetPoint)

                controls.enabled = true
            }
        }
    }, false);
    return
}
initUiControl(canvas)

const switchLabels = new Map()
switchLabels.set('Sample pose', [])
switchLabels.set('response-pose', [new ViewCones(scene, new THREE.MeshBasicMaterial({
    color: 0xffd700,
    wireframe: true
}))])
switchLabels.set('request-pose', [new ViewCones(scene, new THREE.MeshBasicMaterial({
    color: 0xadff2f,
    wireframe: true
}))])

function appendSwitch(label) {
    const color = stringToColor(label + "seed", 90, 100)
    const sphere = new CustomSphere(scene, 2.0, new THREE.MeshLambertMaterial({
        color: color
    }), paramConfig.dataInterval);
    const line = new CustomLine(scene, new THREE.LineBasicMaterial({
        color: color
    }))
    switchLabels.set(label, [sphere, line])
    const elementHTML = '<div class="form-check form-switch">' +
        '<input class="object-toggle form-check-input" type="checkbox" role="switch">' +
        '<label class="form-check-label">' + label + '</label>' +
        '</div>'
    const element = $(elementHTML)
    $('#switch-config').append(element)
    initSwitchTrigger(element)
}

function triggerSwitch(label, visible) {
    if (visible) {
        if (!objectListMap.hasObjectWithLabel(label)) {
            const objects = switchLabels.get(label)
            console.log("[log] create new objects", label)
            objects.forEach((object) => {
                objectListMap.addObjectWithLabel(object, label)
                messages.filter((message) => message.label == label).forEach((message) => triggerMessage(message));
            });
        }
    }
    const objects = objectListMap.getObjectsByLabel(label)
    objects.forEach(function(object) {
        object.set_visible(visible)
    });
}

function initSwitchTrigger(e) {
    $(e).on('change.bootstrapSwitch', function(e) {
        const label = $(e.target).next().text()
        const visible = e.target.checked
        console.log("[log] switch button pressed", label, visible)
        triggerSwitch(label, visible)
    });
}
$('input.object-toggle').each((i, e) => initSwitchTrigger(e))

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
        group: paramConfig.group,
        timestamp: '12345'
    };

    socket.send(JSON.stringify(queryData));
});

const messages = []

function triggerMessage(data) {
    const timestamp = data.timestamp;
    const group = data.group;
    const sequentialId = data.sequentialId;
    const label = data.label;
    if (!objectListMap.hasObjectWithLabel(label)) {
        if (!switchLabels.has(label)) {
            console.log('[log] new label detected:', label);
            appendSwitch(label)
        }
        return;
    }
    const objects = objectListMap.getObjectsByLabel(label)
    objects.forEach(function(object) {
        object.updateByJsonData(data)
    });
}

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    // console.log('received data:', data);
    messages.push(data)
    triggerMessage(data)

    const timestamp = data.timestamp;

    const timestampInput = document.getElementById('timestamp');
    timestampInput.value = timestamp;
});

socket.addEventListener('close', (event) => {
    console.log(`connection closed code: ${event.code} reason: ${event.reason}`);
});

socket.addEventListener('error', (error) => {
    console.error('connection error:', error);
});
