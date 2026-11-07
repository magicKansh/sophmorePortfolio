// FIG. 1: two meshing spur gears drawn as line work, like a CAD viewport.
(function () {
    const canvas = document.getElementById('gears');
    if (!canvas || typeof THREE === 'undefined') return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(7, 6, 11);
    camera.lookAt(1.5, 0.9, 0);

    function gearShape(teeth, outer, root) {
        const shape = new THREE.Shape();
        const step = (Math.PI * 2) / teeth;
        for (let i = 0; i < teeth; i++) {
            const a = i * step;
            [[root, a], [outer, a + step * 0.18], [outer, a + step * 0.42], [root, a + step * 0.6]]
                .forEach(([r, t], j) => {
                    const x = Math.cos(t) * r, y = Math.sin(t) * r;
                    (i === 0 && j === 0) ? shape.moveTo(x, y) : shape.lineTo(x, y);
                });
        }
        shape.closePath();
        const bore = new THREE.Path();
        bore.absarc(0, 0, root * 0.28, 0, Math.PI * 2, true);
        shape.holes.push(bore);
        return shape;
    }

    function gear(teeth, outer, root, color) {
        const geo = new THREE.ExtrudeGeometry(gearShape(teeth, outer, root), {
            depth: 0.6, bevelEnabled: false, curveSegments: 32
        });
        geo.translate(0, 0, -0.3);
        const group = new THREE.Group();
        // white faces hide the back edges, so it reads like a solid model
        group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color: 0xf7f5ef, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        })));
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20),
            new THREE.LineBasicMaterial({ color })));
        // shaft
        const shaft = new THREE.CylinderGeometry(root * 0.28, root * 0.28, 2.4, 32);
        shaft.rotateX(Math.PI / 2);
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(shaft, 30),
            new THREE.LineBasicMaterial({ color: 0x8a867c })));
        return group;
    }

    // 14T and 10T gears; centers spaced so the teeth mesh
    const big = gear(14, 2.1, 1.75, 0x151515);
    const small = gear(10, 1.5, 1.15, 0xd9480f);
    small.position.set(3.25, 0, 0);
    const assembly = new THREE.Group();
    assembly.add(big, small);
    assembly.rotation.x = -0.25;
    scene.add(assembly);

    // center line through both shafts, like a drawing
    const centerLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3, 0, 0), new THREE.Vector3(5.6, 0, 0)]),
        new THREE.LineDashedMaterial({ color: 0x8a867c, dashSize: 0.3, gapSize: 0.15 })
    );
    centerLine.computeLineDistances();
    assembly.add(centerLine);

    function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

    let angle = 0.1;
    function frame() {
        if (visible) {
            angle += 0.004;
            big.rotation.z = angle;
            small.rotation.z = -angle * (14 / 10) + Math.PI / 10;
            assembly.rotation.y = Math.sin(angle * 0.8) * 0.25;
            renderer.render(scene, camera);
        }
        if (!still) requestAnimationFrame(frame);
    }
    frame();
})();
