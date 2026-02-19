"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const state = useRef({
    moveX: 0, moveZ: 0, yaw: 0, pitch: 0,
    touchId: null as number | null,
    touchStartX: 0, touchStartY: 0,
    camera: null as any, scene: null as any, renderer: null as any, raycaster: null as any,
    ground: null as any,
  });

  // 全画面切り替え
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js";
    script.onload = () => {
      if (!containerRef.current) return;
      const THREE = (window as any).THREE;

      // --- 初期化 ---
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      state.current.scene = scene;

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 2, 5);
      state.current.camera = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      containerRef.current.appendChild(renderer.domElement);
      state.current.renderer = renderer;

      state.current.raycaster = new THREE.Raycaster();

      // ライト
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 10, 7);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x707070));

      // 地面
      const grid = new THREE.GridHelper(100, 50, 0x888888, 0x888888);
      scene.add(grid);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ color: 0x2e8b57 }));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      state.current.ground = ground;

      // --- 視点操作 ---
      const handleTouch = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (e.type === 'touchstart' && t.clientX > window.innerWidth / 2) {
          state.current.touchId = t.identifier;
          state.current.touchStartX = t.clientX;
          state.current.touchStartY = t.clientY;
        } else if (e.type === 'touchmove' && t.identifier === state.current.touchId) {
          const dx = t.clientX - state.current.touchStartX;
          const dy = t.clientY - state.current.touchStartY;
          state.current.yaw -= dx * 0.005;
          state.current.pitch -= dy * 0.005;
          state.current.pitch = Math.max(-1.5, Math.min(1.5, state.current.pitch));
          state.current.touchStartX = t.clientX;
          state.current.touchStartY = t.clientY;
        } else if (e.type === 'touchend') {
          state.current.touchId = null;
        }
      };

      window.addEventListener('touchstart', handleTouch);
      window.addEventListener('touchmove', handleTouch, { passive: false });
      window.addEventListener('touchend', handleTouch);

      // --- ループ ---
      const animate = () => {
        requestAnimationFrame(animate);
        if (state.current.camera) {
          state.current.camera.rotation.order = 'YXZ';
          state.current.camera.rotation.y = state.current.yaw;
          state.current.camera.rotation.x = state.current.pitch;

          // スティック移動 (360度)
          if (state.current.moveX !== 0 || state.current.moveZ !== 0) {
            const dir = new THREE.Vector3(state.current.moveX, 0, state.current.moveZ);
            dir.applyQuaternion(state.current.camera.quaternion);
            dir.y = 0;
            state.current.camera.position.addScaledVector(dir.normalize(), 0.15);
          }
        }
        renderer.render(scene, camera);
      };
      animate();

      // リサイズ対応
      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    };
    document.head.appendChild(script);
  }, []);

  // アクション実行 (ボタン用)
  const performAction = (isDelete: boolean) => {
    const { raycaster, camera, scene, ground } = state.current;
    if (!raycaster || !camera) return;

    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const target = intersects[0];
      if (isDelete) {
        if (target.object !== ground) {
          scene.remove(target.object);
          if (window.navigator.vibrate) window.navigator.vibrate(50);
        }
      } else {
        const THREE = (window as any).THREE;
        const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x8b4513 }));
        box.position.copy(target.point).add(target.face.normal.multiplyScalar(0.5));
        box.position.set(Math.round(box.position.x), Math.round(box.position.y), Math.round(box.position.z));
        scene.add(box);
        if (window.navigator.vibrate) window.navigator.vibrate(20);
      }
    }
  };

  // スティック制御
  const handleJoystick = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const max = rect.width / 2;
    state.current.moveX = dx / max;
    state.current.moveZ = dy / max;
  };

  if (!isMounted) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* UIレイヤー */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', padding: '10px' }}>
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
          <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: '5px 12px', borderRadius: '8px', fontSize: '14px' }}>
            TompeiCraft v0.3
          </div>
          <button 
            onClick={toggleFullscreen}
            style={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white', padding: '5px 10px', borderRadius: '5px', pointerEvents: 'auto' }}
          >
            {isFullscreen ? '全画面解除' : '全画面表示'}
          </button>
        </div>

        {/* 中央のレティクル */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '28px', opacity: 0.8 }}>+</div>

        {/* 操作エリア */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '20px' }}>
          
          {/* 左：360度ジョイスティック */}
          <div 
            style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', position: 'relative', pointerEvents: 'auto' }}
            onTouchMove={handleJoystick}
            onTouchEnd={() => { state.current.moveX = 0; state.current.moveZ = 0; }}
          >
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '50%', transform: `translate(calc(-50% + ${state.current.moveX * 30}px), calc(-50% + ${state.current.moveZ * 30}px))` }} />
          </div>

          {/* 右：アクションボタン */}
          <div style={{ display: 'flex', gap: '15px', pointerEvents: 'auto' }}>
            <button 
              onPointerDown={() => performAction(true)}
              style={{ width: '70px', height: '70px', borderRadius: '15px', backgroundColor: 'rgba(255,0,0,0.4)', border: '2px solid white', color: 'white', fontWeight: 'bold' }}
            >
              破壊
            </button>
            <button 
              onPointerDown={() => performAction(false)}
              style={{ width: '70px', height: '70px', borderRadius: '15px', backgroundColor: 'rgba(0,255,0,0.4)', border: '2px solid white', color: 'white', fontWeight: 'bold' }}
            >
              配置
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
