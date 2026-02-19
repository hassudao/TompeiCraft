"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // ゲームの内部状態を保持するref
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

    // --- 1. シーンとレンダラーの初期化 ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // 空色
    state.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 2, 5); // 少し高い位置から
    state.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    state.current.renderer = renderer;

    // --- 2. 地面（トンペイクラフツの第一歩） ---
    // 100x100のグリッド
    const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x444444);
    scene.add(gridHelper);

    // 簡易的な緑の地面
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(5, 10, 7);
    scene.add(sunLight);

    // --- 3. スマホ視点操作ロジック ---
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // 画面右半分で視点操作開始
      if (touch.clientX > window.innerWidth / 2) {
        state.current.touchId = touch.identifier;
        state.current.touchStartX = touch.clientX;
        state.current.touchStartY = touch.clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === state.current.touchId) {
          const dx = touch.clientX - state.current.touchStartX;
          const dy = touch.clientY - state.current.touchStartY;

          // 視点感度設定
          state.current.yaw -= dx * 0.005;
          state.current.pitch -= dy * 0.005;
          // 真上・真下を向きすぎないように制限
          state.current.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.current.pitch));

          state.current.touchStartX = touch.clientX;
          state.current.touchStartY = touch.clientY;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === state.current.touchId) {
          state.current.touchId = null;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    // --- 4. アニメーションループ ---
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (state.current.camera) {
        // 回転の適用
        state.current.camera.rotation.order = 'YXZ';
        state.current.camera.rotation.y = state.current.yaw;
        state.current.camera.rotation.x = state.current.pitch;

        // 移動の計算
        if (state.current.moveForward !== 0) {
          const dir = new THREE.Vector3(0, 0, -1);
          dir.applyQuaternion(state.current.camera.quaternion);
          dir.y = 0; // 地面と平行に移動
          dir.normalize();
          state.current.camera.position.addScaledVector(dir, 0.1);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // クリーンアップ
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!isMounted) return null;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      {/* 3D描画用コンテナ */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* 画面中央の照準 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="text-white text-3xl font-light opacity-60">+</div>
      </div>

      {/* 操作パネル */}
      <div className="absolute inset-0 flex pointer-events-none">
        {/* 左側：移動ボタン（長押しで前進） */}
        <div className="w-1/2 h-full flex items-end justify-start p-10">
          <div 
            className="w-24 h-24 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center pointer-events-auto active:bg-white/40"
            onTouchStart={() => { state.current.moveForward = 1; }}
            onTouchEnd={() => { state.current.moveForward = 0; }}
          >
            <span className="text-white text-xs font-bold">MOVE</span>
          </div>
        </div>
        
        {/* 右側：視点・アクションエリア（透明な受け口） */}
        <div className="w-1/2 h-full relative pointer-events-none">
           <div className="absolute top-4 right-4 text-white bg-black/50 px-3 py-1 rounded text-sm font-mono">
             TompeiCraft v0.1
           </div>
        </div>
      </div>
    </main>
  );
}
