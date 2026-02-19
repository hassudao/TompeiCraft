"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const state = useRef({
    moveForward: 0,
    yaw: 0,
    pitch: 0,
    touchId: null as number | null,
    touchStartX: 0,
    touchStartY: 0,
    camera: null as any,
  });

  useEffect(() => {
    setIsMounted(true);

    // Three.jsをCDNから動的に読み込む
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js";
    script.onload = () => {
      if (!containerRef.current) return;
      const THREE = (window as any).THREE;

      // --- シーン構築 ---
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb); // 青空

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 5, 10);
      state.current.camera = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      // --- 地面とブロック ---
      const grid = new THREE.GridHelper(100, 50, 0xffffff, 0x888888);
      scene.add(grid);

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
      );
      box.position.y = 1;
      scene.add(box);

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 10, 7);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x404040));

      // --- 視点操作 ---
      const handleTouch = (e: TouchEvent) => {
        if (e.type === 'touchstart') {
          const t = e.touches[0];
          if (t.clientX > window.innerWidth / 2) {
            state.current.touchId = t.identifier;
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
          }
        } else if (e.type === 'touchmove') {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === state.current.touchId) {
              const dx = t.clientX - state.current.touchStartX;
              const dy = t.clientY - state.current.touchStartY;
              state.current.yaw -= dx * 0.005;
              state.current.pitch -= dy * 0.005;
              state.current.pitch = Math.max(-1.5, Math.min(1.5, state.current.pitch));
              state.current.touchStartX = t.clientX;
              state.current.touchStartY = t.clientY;
            }
          }
        }
      };

      window.addEventListener('touchstart', handleTouch);
      window.addEventListener('touchmove', handleTouch, { passive: false });

      // --- ループ ---
      const animate = () => {
        requestAnimationFrame(animate);
        if (state.current.camera) {
          state.current.camera.rotation.order = 'YXZ';
          state.current.camera.rotation.y = state.current.yaw;
          state.current.camera.rotation.x = state.current.pitch;

          if (state.current.moveForward) {
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(state.current.camera.quaternion);
            dir.y = 0;
            state.current.camera.position.addScaledVector(dir.normalize(), 0.15);
          }
        }
        renderer.render(scene, camera);
      };
      animate();
    };
    document.head.appendChild(script);
  }, []);

  if (!isMounted) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      
      {/* UIレイヤー */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start', padding: '5px 10px', borderRadius: '5px' }}>
          TompeiCraft v0.1
        </div>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '24px', opacity: 0.5 }}>+</div>

        <div style={{ marginTop: 'auto' }}>
          <div 
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', 
              backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', pointerEvents: 'auto'
            }}
            onTouchStart={() => { state.current.moveForward = 1; }}
            onTouchEnd={() => { state.current.moveForward = 0; }}
          >
            MOVE
          </div>
        </div>
      </div>
    </div>
  );
        }
