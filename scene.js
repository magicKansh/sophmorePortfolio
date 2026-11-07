// Line drawing of two meshing spur gears, like a CAD viewport.
// Drag to rotate the view. Hidden if three.js or WebGL is unavailable.
(function () {
    const canvas = document.getElementById('gears');
    const fail = () => document.documentElement.classList.add('no-3d');
    if (!canvas || typeof THREE === 'undefined') return fail();

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
        return fail();
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 15);

    // Spur gear outline with simple trapezoid teeth, extruded and drawn as edges.
    // module m sets tooth size; pitch radius = teeth * m / 2.
    const m = 0.36;
    function gear(teeth, color) {
        const r = (teeth * m) / 2;
        const outer = r + m;
        const root = r - 1.25 * m;
        const step = (Math.PI * 2) / teeth;
        const shape = new THREE.Shape();
        for (let i = 0; i < teeth; i++) {
            const a = i * step;
            const pts = [
                [root, a - step * 0.25],
                [outer, a - step * 0.12],
                [outer, a + step * 0.12],
                [root, a + step * 0.25]
            ];
            pts.forEach(([rad, t], j) => {
                const x = Math.cos(t) * rad, y = Math.sin(t) * rad;
                if (i === 0 && j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
            });
        }
        shape.closePath();
        const bore = new THREE.Path();
        bore.absarc(0, 0, m * 1.4, 0, Math.PI * 2, true);
        shape.holes.push(bore);

        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false, curveSegments: 32 });
        geo.translate(0, 0, -0.3);
        const group = new THREE.Group();
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color })));

        // shaft
        const shaft = new THREE.CylinderGeometry(m * 1.4, m * 1.4, 3, 24, 1, true);
        shaft.rotateX(Math.PI / 2);
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(shaft, 30), new THREE.LineBasicMaterial({ color: 0x8a8a8a })));
        return { group, r };
    }

    const big = gear(14, 0x141414);
    const small = gear(10, 0xc4161c);
    const rig = new THREE.Group();
    rig.add(big.group, small.group);
    const center = big.r + small.r;
    big.group.position.x = -center * 0.42;
    small.group.position.x = center * 0.58;
    scene.add(rig);

    // starting view: tilted, like an isometric CAD view
    const view = { x: -0.55, y: 0.6 };
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        view.y += (e.clientX - lastX) * 0.01;
        view.x += (e.clientY - lastY) * 0.01;
        view.x = Math.max(-1.5, Math.min(1.5, view.x));
        lastX = e.clientX; lastY = e.clientY;
        if (still) draw(); // keep dragging responsive even with reduced motion
    });
    const stop = () => { dragging = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let angle = 0, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

    function draw() {
        resize();
        big.group.rotation.z = angle;
        // meshing: opposite direction at the tooth ratio, offset half a tooth so teeth interlock
        small.group.rotation.z = -angle * (14 / 10) + Math.PI / 10;
        rig.rotation.x = view.x;
        rig.rotation.y = view.y;
        renderer.render(scene, camera);
    }

    function frame() {
        if (visible) {
            angle += 0.006;
            draw();
        }
        requestAnimationFrame(frame);
    }

    if (still) {
        draw();
        window.addEventListener('resize', draw);
    } else {
        frame();
    }
})();
