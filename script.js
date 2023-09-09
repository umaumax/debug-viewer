const scene = new THREE.Scene();

const fov = 75.0
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.5;
camera.position.x = -1.0;
camera.position.z = 3;

camera.lookAt(scene.position);

const canvas = document.getElementById('canvas')
const canvas_container = document.getElementById('canvas-container')
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});

function update_canvas() {
    const ratio = 16.0 / 9.0
    var canvasWidth = canvas_container.offsetWidth;
    var canvasHeight = canvasWidth / ratio;
    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWidth, canvasHeight);
}
update_canvas()
canvas_container.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    update_canvas()
});

// // ジオメトリとマテリアルの作成
// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshBasicMaterial({
// color: 0x00ff00
// });
// const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);
//
// // アニメーションの更新
// const animate = () => {
// requestAnimationFrame(animate);
//
// // オブジェクトを回転させるアニメーション
// cube.rotation.x += 0.01;
// cube.rotation.y += 0.01;
//
// renderer.render(scene, camera);
// };

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
    // Get current vertices from the geometry
    const currentVertices = line.geometry.attributes.position.array;
    const newCurrentVertices = new Float32Array(currentVertices.length + 3)
    newCurrentVertices.set([...currentVertices, newX, newY, newZ]);
    console.log('currentVertices', currentVertices, newCurrentVertices)

    // Add the new coordinates to the vertex array
    // currentVertices.push(newX, newY, newZ);

    // Create a new geometry with the updated vertices
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newCurrentVertices));

    // Create or update the Line object
    const newLine = new THREE.Line(newGeometry, material);

    // Remove the old Line object from the scene and add the new one
    scene.remove(line);
    scene.add(newLine);

    // Update the reference to the Line object
    return newLine;
}

// Example usage:
// addPointToLine(line, 6, 2, 0, material, scene);

// // 連続した点の座標を設定
// const points = [];
// for (let i = 0; i < 100; i++) {
// const x = (i - 50) * 0.1;
// const y = Math.sin(x); // 任意の点のy座標を設定
// const z = 0;
// points.push(new THREE.Vector3(x, y, z));
// }
//
// // ラインのマテリアルを作成
// const material = new THREE.LineBasicMaterial({
// color: 0x00aa00
// });
//
// // 連続した線を作成
// const geometry = new THREE.BufferGeometry().setFromPoints(points);
// const line = new THREE.Line(geometry, material);
//
// // シーンに追加
// scene.add(line);

class CustomLine {
    constructor(scene) {
        this.scene = scene;
        this.points = this.generatePoints();
        this.material = new THREE.LineBasicMaterial({
            color: 0x00aa00
        });
        this.geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        this.line = new THREE.Line(this.geometry, this.material);
        this.addToScene();
    }

    generatePoints() {
        const points = [];
        for (let i = 0; i < 100; i++) {
            const x = (i - 50) * 0.1;
            const y = Math.sin(x); // 任意の点のy座標を設定
            const z = 0;
            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    }

    addToScene() {
        this.scene.add(this.line);
    }

    update_by_json_data(data) {
        const position = new THREE.Vector3(data['position.x'], data['position.y'], data['position.z'])
        console.log(this.line.geometry)
        this.line = addPointToLine(this.line, position.x, position.y, position.z, this.line.material, scene)
    }

    update() {}
}
const line = new CustomLine(scene)

// const customLine = new CustomLine(scene);

// const emphasizedPointIndex = 50; // 例: 50番目の点を強調表示

// function emphasizePoint(index) {
// const emphasizedPoint = points[index];
//
// const sphereGeometry = new THREE.SphereGeometry(0.02, 32, 32);
// const sphereMaterial = new THREE.MeshBasicMaterial({
// color: 0x00ff00
// });
// const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
// sphere.position.copy(emphasizedPoint);
//
// scene.add(sphere);
// }
//
// for (let i = 0; i < points.length; i++) {
// emphasizePoint(i);
// }

class CustomSphere {
    constructor(scene) {
        this.scene = scene;
        this.spheres = [];
        this.material = new THREE.MeshBasicMaterial({
            color: 0x00ff00
        });
        this.generateSpheres();
        this.addToScene();
    }

    generateSpheres() {
        for (let i = 0; i < 100; i++) {
            const x = (i - 50) * 0.1;
            const y = Math.sin(x); // 任意の点のy座標を設定
            const z = 0;
            const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16); // 球体のジオメトリを作成
            const sphere = new THREE.Mesh(sphereGeometry, this.material); // 球体を作成
            sphere.position.set(x, y, z); // 球体の位置を設定
            this.spheres.push(sphere);
        }
    }

    addToScene() {
        this.spheres.forEach((sphere) => {
            this.scene.add(sphere);
        });
    }

    update_by_json_data(data) {
        const position = new THREE.Vector3(data['position.x'], data['position.y'], data['position.z']);
        const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const sphere = new THREE.Mesh(sphereGeometry, this.material);
        sphere.position.copy(position);
        this.scene.add(sphere);
    }

    update() {}
}

const points = new CustomSphere(scene);

class ObjectListMap {
    constructor() {
        this.map = new Map();
    }

    // キーに対してオブジェクトを追加
    addObjectWithLabel(object, label) {
        if (!this.map.has(label)) {
            this.map.set(label, []);
        }
        this.map.get(label).push(object);
    }

    // キーを指定してオブジェクトの配列を取得
    getObjectsByLabel(label) {
        return this.map.get(label) || [];
    }

    // キーを指定してオブジェクトの存在を判定
    hasObjectWithLabel(label) {
        return this.map.has(label);
    }
}

// 使用例
const objectListMap = new ObjectListMap();

class CustomArrow {
    constructor(scene, position, rotation) {
        this.scene = scene;

        this.direction = new THREE.Vector3(1, 0, 0);
        this.position = position || new THREE.Vector3(0, 0, 0);
        this.rotation = rotation || new THREE.Euler(0, 0, 0);

        this.length = 1;
        this.color = 0xff33aa;

        // ArrowHelperを作成してシーンに追加
        this.arrow = new THREE.ArrowHelper(this.direction, this.position, this.length, this.color);
        scene.add(this.arrow);
    }

    update_by_json_data(data) {
        const position = new THREE.Vector3(data['position.x'], data['position.y'], data['position.z'])
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().set(data['rotation.x'], data['rotation.y'], data['rotation.z'], data['rotation.z']));
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.update()
    }

    update() {
        this.arrow.position.copy(this.position);
        const directionVector = new THREE.Vector3(1, 0, 0);
        directionVector.applyEuler(this.rotation);
        this.arrow.setDirection(directionVector);
    }
}

const customArrow = new CustomArrow(scene);
objectListMap.addObjectWithLabel(customArrow, "ARKit tracking pose")
objectListMap.addObjectWithLabel(line, "ARKit tracking pose")
objectListMap.addObjectWithLabel(points, "ARKit tracking pose")

function set_axis(scene) {
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
    const xAxisMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000
    });
    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    scene.add(xAxisLine);

    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]);
    const yAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00
    });
    const yAxisLine = new THREE.Line(yAxisGeometry, yAxisMaterial);
    scene.add(yAxisLine);

    // Z軸の線を作成
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)]);
    const zAxisMaterial = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    scene.add(zAxisLine);
}
set_axis(scene)

var t = 0;

function animate_arrow() {
    var index = parseInt(t / 5) % points.length
    const point = points[index];
    var pos = point

    // 矢印の位置と回転を定期的に更新
    const time = t * 0.01; // 時間に基づいて位置と回転を更新する例
    // const newX = Math.sin(time);
    // const newY = Math.cos(time);
    const newRotation = new THREE.Euler(0, time, 0);
    // new THREE.Euler().setFromQuaternion( arrow.quaternion );
    t += 1;
    customArrow.position.copy(pos);
    // customArrow.position.set(newX, newY, 0);
    customArrow.rotation.copy(newRotation);
    customArrow.update()
}
// アニメーションの更新
const animate = () => {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
};

animate();

function init_mouse_control() {
    // マウスドラッグのための変数
    let isDragging = false;
    let previousMousePosition = {
        x: 0,
        y: 0
    };

    // ズームのための変数
    let zoomLevel = 1;

    // マウスが押されたときの処理
    document.addEventListener('mousedown', (event) => {
        isDragging = true;
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    });

    // マウスが離れたときの処理
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // マウスが動いたときの処理
    document.addEventListener('mousemove', (event) => {
        if (!isDragging) return;

        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        // カメラの移動速度
        const speed = 0.1;

        // カメラの位置を変更
        camera.position.x += deltaMove.x * speed;
        camera.position.y -= deltaMove.y * speed;

        // カメラの注視点を中心に
        camera.lookAt(scene.position);

        // レンダリング
        renderer.render(scene, camera);

        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    });

    // // マウスホイールでズームインとズームアウト
    // document.addEventListener('mousewheel', (event) => {
    // const zoomSpeed = 0.1;
    //
    // if (event.deltaY < 0) {
    // // ホイールを上にスクロールした場合、ズームイン
    // camera.position.z -= zoomSpeed;
    // } else {
    // // ホイールを下にスクロールした場合、ズームアウト
    // camera.position.z += zoomSpeed;
    // }
    //
    // // レンダリング
    // renderer.render(scene, camera);
    // });
}
init_mouse_control()


const host = window.location.hostname
const port = 8765
const socket = new WebSocket('ws://' + host + ':' + port);

socket.addEventListener('open', (event) => {
    console.log('connection opend');
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('received data:', data);

    const timestamp = data.timestamp;
    const group = data.group;
    const sequential_id = data.sequential_id;
    const label = data.label;
    if (!objectListMap.hasObjectWithLabel(label)) {
        console.log('label skipped:', label);
        return;
    }
    const objects = objectListMap.getObjectsByLabel(label)
    objects.forEach(function(object) {
        object.update_by_json_data(data)
    });
});

socket.addEventListener('close', (event) => {
    console.log(`connection closed code: ${event.code} reason: ${event.reason}`);
});

socket.addEventListener('error', (error) => {
    console.error('connection error:', error);
});
