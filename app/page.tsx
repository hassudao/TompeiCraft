"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const movePadRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // ゲームの状態管理
  const state = useRef({
    camera: null as THREE.PerspectiveCamera | null,
    scene: null as THREE.Scene | null,
    renderer: null as THREE.WebGLRenderer | null,
    moveForward: 0,
    moveSide: 0,
    yaw: 0,   // 左右視点
    pitch: 0, // 上下視点
  });

  useEffect(() => {
    setIsClient(true);
    if (!containerRef.current) return;

    // --- 1. Three.js 初期設定 ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // 青空
    state.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5); // プレイヤーの目線の高さ
    state.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    state.current.renderer = renderer;

    // --- 2. 地面と環境光 ---
    const grid = new THREE.GridHelper(100, 100);
    scene.add(grid);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(10, 20, 10);
    scene.add(sunLight);

    // --- 3. スマホ操作ロジック (右画面: 視点移動) ---
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      // 画面の右半分なら視点移動
      if (touch.clientX > window.innerWidth / 2) {
        if (touchStartX !== 0) {
          const dx = touch.clientX - touchStartX;
          const dy = touch.clientY - touchStartY;
          state.current.yaw -= dx * 0.005;
          state.current.pitch -= dy * 0.005;
          state.current.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, state.current.pitch));
        }
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    };

    const handleTouchEnd = () => {
      touchStartX = 0;
      touchStartY = 0;
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    // --- 4. アニメーションループ ---
    const animate = () => {
      requestAnimationFrame(animate);

      if (state.current.camera) {
        // 視点の回転適用
        state.current.camera.rotation.order = 'YXZ';
        state.current.camera.rotation.y = state.current.yaw;
        state.current.camera.rotation.x = state.current.pitch;

        // 左パッドによる移動（簡易実装）
        const direction = new THREE.Vector3(state.current.moveSide, 0, -state.current.moveForward);
        direction.applyQuaternion(state.current.camera.quaternion);
        direction.y = 0; // 上下には飛ばない
        state.current.camera.position.addScaledVector(direction, 0.1);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  if (!isClient) return null;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      {/* 3D描画コンテナ */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* 中央のレティクル（照準） */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-light pointer-events-none">
        +
      </div>

      {/* UIレイヤー */}
      <div className="absolute inset-0 flex">
        {/* 左側：移動パッドエリア */}
        <div 
          className="w-1/2 h-full flex items-end p-12"
          onTouchStart={(e) => {
            state.current.moveForward = 1;
          }}
          onTouchEnd={() => {
            state.current.moveForward = 0;
          }}
        >
          <div ref={movePadRef} className="w-24 h-24 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/50" />
          </div>
        </div>

        {/* 右側：アクション・視点エリア */}
        <div 
          className="w-1/2 h-full"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* ここはThree.jsのイベントハンドラで処理 */}
        </div>
      </div>

      {/* ゲームタイトル表示 */}
      <div className="absolute top-4 left-4 text-white font-bold tracking-widest bg-black/40 px-3 py-1 rounded">
        TompeiCraft Alpha
      </div>
    </div>
  );
}
