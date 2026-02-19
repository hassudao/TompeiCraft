"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const state = useRef({
    moveForward: 0, yaw: 0, pitch: 0,
    touchId: null as number | null,
    touchStartX: 0, touchStartY: 0,
    touchStartTime: 0, // 長押し判定用
    camera: null as any,
    scene: null as any,
    raycaster: null as any,
    blocks: [] as any[], // 配置したブロックのリスト
  });

  useEffect(() => {
    setIsMounted(true);
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js";
    script.onload = () => {
      if (!containerRef.current) return;
      const THREE = (window as any).THREE;

      // --- シーン・カメラ・ライト ---
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87ceeb);
      state.current.scene = scene;

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 3, 10);
      state.current.camera = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      state.current.raycaster = new THREE.Raycaster();

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 10, 7);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x606060));

      // 地面
      const grid = new THREE.GridHelper(100, 50, 0x888888, 0x888888);
      scene.add(grid);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ color: 0x44aa44 }));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      // --- ブロック操作関数 ---
      const performAction = (isDelete: boolean) => {
        const raycaster = state.current.raycaster;
        // 画面中央（0,0）からレイを飛ばす
        raycaster.setFromCamera({ x: 0, y: 0 }, state.current.camera);
        const intersects = raycaster.intersectObjects(state.current.scene.children);

        if (intersects.length > 0) {
          const target = intersects[0];
          
          if (isDelete) {
            // 削除（地面以外）
            if (target.object !== ground && target.object !== grid) {
              scene.remove(target.object);
              if (window.navigator.vibrate) window.navigator.vibrate(50); // 振動
            }
          } else {
            // 設置（重なり防止のため少し浮かせる）
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(1, 1, 1),
              new THREE.MeshLambertMaterial({ color: 0x8b4513 }) // 木の色
            );
            // 当たった面の法線方向にずらして配置
            box.position.copy(target.point).add(target.face.normal.multiplyScalar(0.5));
            // 座標を整数に丸める（マイクラ風）
            box.position.set(Math.round(box.position.x), Math.round(box.position.y), Math.round(box.position.z));
            scene.add(box);
          }
        }
      };

      // --- タッチイベント ---
      const handleTouch = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (e.type === 'touchstart') {
          if (t.clientX > window.innerWidth / 2) {
            state.current.touchId = t.identifier;
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
            state.current.touchStartTime = Date.now();
          }
        } else if (e.type === 'touchmove') {
          if (t.identifier === state.current.touchId) {
            const dx = t.clientX - state.current.touchStartX;
            const dy = t.clientY - state.current.touchStartY;
            state.current.yaw -= dx * 0.005;
            state.current.pitch -= dy * 0.005;
            state.current.pitch = Math.max(-1.5, Math.min(1.5, state.current.pitch));
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
          }
        } else if (e.type === 'touchend') {
          if (t.identifier === state.current.touchId) {
            const duration = Date.now() - state.current.touchStartTime;
            // 短いタップなら設置、長い(500ms以上)なら破壊
            if (duration < 500) {
              performAction(false);
            } else {
              performAction(true);
            }
            state.current.touchId = null;
          }
        }
      };

      window.addEventListener('touchstart', handleTouch);
      window.addEventListener('touchmove', handleTouch, { passive: false });
      window.addEventListener('touchend', handleTouch);

      const animate = () => {
        requestAnimationFrame(animate);
        if (state.current.camera) {
          state.current.camera.rotation.order = 'YXZ';
          state.current.camera.rotation.y = state.current.yaw;
          state.current.camera.rotation.x = state.current.pitch;
          if (state.current.moveForward) {
            const dir = new THREE.Vector3(0,0,-1).applyQuaternion(state.current.camera.quaternion);
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
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start', padding: '5px 10px', borderRadius: '5px' }}>
          TompeiCraft v0.2 <br/> <span style={{fontSize: '10px'}}>タップ:置く / 長押し:壊す</span>
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '24px', opacity: 0.8 }}>+</div>
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
          >MOVE</div>
        </div>
      </div>
    </div>
  );
              }
