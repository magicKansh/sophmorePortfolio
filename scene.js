// 3D background: spinning gears, wireframe shapes, and a particle field.
// If WebGL or three.js is unavailable, the CSS gradient background shows instead.
(function () {
    const canvas = document.getElementById('bg');
    if (!canvas || typeof THREE === 'undefined') return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
        return;
    }
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070d, 0.035);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 14);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const cyanLight = new THREE.PointLight(0x22d3ee, 2.2, 40);
    cyanLight.position.set(-8, 6, 8);
    scene.add(cyanLight);
    const violetLight = new THREE.PointLight(0xa855f7, 2.2, 40);
    violetLight.position.set(8, -4, 6);
    scene.add(violetLight);

    // Gear geometry: a toothed outline with a center hole, extruded with a bevel
    function gearGeometry(teeth, outer, inner, depth) {
        const shape = new THREE.Shape();
        const step = (Math.PI * 2) / teeth;
        for (let i = 0; i < teeth; i++) {
            const a = i * step;
            const pts = [
                [inner, a],
                [outer, a + step * 0.15],
                [outer, a + step * 0.45],
                [inner, a + step * 0.6]
            ];
            pts.forEach(([r, t], j) => {
                const x = Math.cos(t) * r;
                const y = Math.sin(t) * r;
                if (i === 0 && j === 0) shape.moveTo(x, y);
                else shape.lineTo(x, y);
            });
        }
        shape.closePath();
        const hole = new THREE.Path();
        hole.absarc(0, 0, inner * 0.35, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, {
            depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2, curveSegments: 24
        });
        geo.center();
        return geo;
    }

    const metal = color => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.28 });

    const objects = [];
    function add(mesh, x, y, z, spin) {
        mesh.position.set(x, y, z);
        mesh.userData = { spin, baseY: y, phase: Math.random() * Math.PI * 2 };
        scene.add(mesh);
        objects.push(mesh);
        return mesh;
    }

    // Two meshing gears on the right, one on the left
    const gearA = add(new THREE.Mesh(gearGeometry(14, 2.2, 1.85, 0.5), metal(0x334155)), 6.2, 2.4, -2, 0.25);
    const gearB = add(new THREE.Mesh(gearGeometry(10, 1.55, 1.25, 0.5), metal(0x4c1d95)), 8.9, 0.1, -2, -0.35);
    add(new THREE.Mesh(gearGeometry(18, 2.8, 2.45, 0.4), metal(0x164e63)), -7.5, -3.2, -5, 0.15);
    gearA.rotation.x = gearB.rotation.x = 0.35;

    // Wireframe shapes
    const wire = color => new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.35 });
    add(new THREE.Mesh(new THREE.TorusKnotGeometry(1.6, 0.42, 140, 14), wire(0x22d3ee)), -6.5, 3.4, -4, 0.2);
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), wire(0xa855f7)), 3.5, -4.2, -1, 0.3);
    add(new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), wire(0x22d3ee)), -2.8, -5.5, 1, 0.45);
    add(new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 12, 80), wire(0xf0abfc)), 0.5, 5.2, -6, 0.25);

    // Particle field
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
        color: 0x93c5fd, size: 0.05, transparent: true, opacity: 0.7
    }));
    scene.add(particles);

    // Mouse parallax + scroll
    const mouse = { x: 0, y: 0 };
    window.addEventListener('pointermove', e => {
        mouse.x = e.clientX / window.innerWidth - 0.5;
        mouse.y = e.clientY / window.innerHeight - 0.5;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const clock = new THREE.Clock();
    function frame() {
        const t = clock.getElapsedTime();
        const scroll = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);

        objects.forEach(o => {
            o.rotation.z += o.userData.spin * 0.01;
            o.rotation.y += o.userData.spin * 0.004;
            o.position.y = o.userData.baseY + Math.sin(t * 0.6 + o.userData.phase) * 0.25;
        });
        // keep the two meshing gears turning in sync (14 vs 10 teeth)
        gearB.rotation.z = -gearA.rotation.z * (14 / 10) + 0.2;

        particles.rotation.y = t * 0.02;
        camera.position.x += (mouse.x * 2 - camera.position.x) * 0.04;
        camera.position.y += (-mouse.y * 1.5 - scroll * 6 - camera.position.y) * 0.04;
        camera.lookAt(0, -scroll * 6, 0);

        renderer.render(scene, camera);
        if (!reduceMotion) requestAnimationFrame(frame);
    }
    frame();
})();
