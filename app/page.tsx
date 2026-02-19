"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  const state = useRef({
    camera: null as THREE.PerspectiveCamera | null,
    scene: null as THREE.Scene | null,
    renderer: null as THREE.WebGLRenderer | null,
    moveForward: 0,
    yaw: 0,
    pitch: 0,
    touchId: null as number | null,
    touchStartX: 0,
    touchStartY: 0,
  });

  useEffect(() => {
    setIsMounted(true);
    if (!containerRef.current) return;

    // --- 1. シーン・カメラ・レンダラー ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // 青空
    state.current.scene = scene;

    // 画面サイズを取得
    const width = window.innerWidth;
    const height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10); // 少し引いた位置に
    camera.lookAt(0, 0, 0);
    state.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    // 直接スタイルを固定
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '0'; 
    
    containerRef.current.appendChild(renderer.domElement);
    state.current.renderer = renderer;

    // --- 2. 目に見えるオブジェクトを配置 ---
    // 地面
    const grid = new THREE.GridHelper(200, 50, 0xffffff, 0x555555);
    scene.add(grid);

    // 中央に目印の赤いブロック
    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 1;
    scene.add(box);

    // ライト
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);

    // --- 3. 操作ロジック（右画面視点移動） ---
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX > window.innerWidth / 2) {
        state.current.touchId = touch.identifier;
        state.current.touchStartX = touch.clientX;
        state.current.touchStartY = touch.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === state.current.touchId) {
          const dx = t.clientX - state.current.touchStartX;
          const dy = t.clientY - state.current.touchStartY;
          state.current.yaw -= dx * 0.007;
          state.current.pitch -= dy * 0.007;
          state.current.pitch = Math.max(-1.5, Math.min(1.5, state.current.pitch));
          state.current.touchStartX = t.clientX;
          state.current.touchStartY = t.clientY;
        }
      }
    };

    const onTouchEnd = () => { state.current.touchId = null; };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // --- 4. ループ ---
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (state.current.camera) {
        state.current.camera.rotation.order = 'YXZ';
        state.current.camera.rotation.y = state.current.yaw;
        state.current.camera.rotation.x = state.current.pitch;

        if (state.current.moveForward) {
          const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(state.current.camera.quaternion);
          dir.y = 0;
          state.current.camera.position.addScaledVector(dir.normalize(), 0.2);
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden' }}>
      {/* 3D レンダラー用コンテナ */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* UIレイヤー: zIndexを上げて手前に出す */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
        
        <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start', padding: '5px 10px', borderRadius: '5px', fontSize: '14px' }}>
          TompeiCraft v0.1
        </div>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '24px', opacity: 0.5 }}>
          +
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', height: '150px' }}>
          <div 
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', 
              backgroundColor: 'rgba(255,255,255,0.3)', border: '2px solid white',
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
