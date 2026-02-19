"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const state = useRef({
    moveX: 0, moveZ: 0, yaw: 0, pitch: 0,
    camera: null as any, scene: null as any, renderer: null as any, raycaster: null as any,
    ground: null as any,
    velocity: 0, isGrounded: true,
    // ターゲット用
    highlightBox: null as any,
    // タッチ管理
    rightTouchId: null as number | null,
    touchStartX: 0, touchStartY: 0,
    touchStartTime: 0,
    hasMoved: false, // 動いたかどうか
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
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

      // ハイライト用の箱（枠線だけ）
      const hGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
      const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5 });
      const hBox = new THREE.Mesh(hGeo, hMat);
      hBox.visible = false;
      scene.add(hBox);
      state.current.highlightBox = hBox;

      // ライト
      scene.add(new THREE.AmbientLight(0x909090));
      const sun = new THREE.DirectionalLight(0xffffff, 0.8);
      sun.position.set(5, 10, 7);
      scene.add(sun);

      // 地面
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ color: 0x4d8d4d }));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      state.current.ground = ground;

      // --- アクション ---
      const performAction = (isDelete: boolean) => {
        const { raycaster, camera, scene, ground } = state.current;
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const intersects = raycaster.intersectObjects(scene.children.filter((o:any) => o !== state.current.highlightBox));
        
        if (intersects.length > 0) {
          const target = intersects[0];
          if (isDelete) {
            if (target.object !== ground) {
              scene.remove(target.object);
              if (navigator.vibrate) navigator.vibrate(50);
            }
          } else {
            const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x8b4513 }));
            box.position.copy(target.point).add(target.face.normal.multiplyScalar(0.5));
            box.position.set(Math.round(box.position.x), Math.round(box.position.y), Math.round(box.position.z));
            scene.add(box);
            if (navigator.vibrate) navigator.vibrate(20);
          }
        }
      };

      // --- イベント ---
      const handleTouch = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (t.clientX > window.innerWidth / 2) {
          if (e.type === 'touchstart') {
            state.current.rightTouchId = t.identifier;
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
            state.current.touchStartTime = Date.now();
            state.current.hasMoved = false;
          } else if (e.type === 'touchmove' && t.identifier === state.current.rightTouchId) {
            const dx = t.clientX - state.current.touchStartX;
            const dy = t.clientY - state.current.touchStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.current.hasMoved = true;
            state.current.yaw -= dx * 0.005;
            state.current.pitch -= dy * 0.005;
            state.current.pitch = Math.max(-1.5, Math.min(1.5, state.current.pitch));
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
          } else if (e.type === 'touchend' && t.identifier === state.current.rightTouchId) {
            const duration = Date.now() - state.current.touchStartTime;
            // 指を動かしていない時だけアクションを実行
            if (!state.current.hasMoved) {
              performAction(duration > 500);
            }
            state.current.rightTouchId = null;
          }
        }
      };

      window.addEventListener('touchstart', handleTouch);
      window.addEventListener('touchmove', handleTouch, { passive: false });
      window.addEventListener('touchend', handleTouch);

      // --- ループ ---
      const animate = () => {
        requestAnimationFrame(animate);
        const s = state.current;
        if (s.camera) {
          s.camera.rotation.order = 'YXZ';
          s.camera.rotation.y = s.yaw;
          s.camera.rotation.x = s.pitch;

          // ハイライト更新
          s.raycaster.setFromCamera({ x: 0, y: 0 }, s.camera);
          const intersects = s.raycaster.intersectObjects(s.scene.children.filter((o:any) => o !== s.highlightBox));
          if (intersects.length > 0 && intersects[0].object !== s.ground) {
             const target = intersects[0].object;
             s.highlightBox.position.copy(target.position);
             s.highlightBox.visible = true;
          } else {
             s.highlightBox.visible = false;
          }

          // 移動・重力
          if (s.moveX !== 0 || s.moveZ !== 0) {
            const dir = new THREE.Vector3(s.moveX, 0, s.moveZ).applyQuaternion(s.camera.quaternion);
            dir.y = 0;
            s.camera.position.addScaledVector(dir.normalize(), 0.15);
          }
          s.velocity -= 0.015;
          s.camera.position.y += s.velocity;
          if (s.camera.position.y <= 2) {
            s.camera.position.y = 2; s.velocity = 0; s.isGrounded = true;
          } else { s.isGrounded = false; }
        }
        renderer.render(scene, camera);
      };
      animate();

      window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
    };
    document.head.appendChild(script);
  }, []);

  const handleJump = () => { if (state.current.isGrounded) state.current.velocity = 0.3; };
  const handleJoystick = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    state.current.moveX = (touch.clientX - (rect.left + rect.width/2)) / (rect.width/2);
    state.current.moveZ = (touch.clientY - (rect.top + rect.height/2)) / (rect.width/2);
  };

  if (!isMounted) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden', touchAction: 'none' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* UI */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', padding: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', pointerEvents: 'auto' }}>
          <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>
            TompeiCraft v0.5 | {isFullscreen ? 'FULL' : 'WINDOW'}
          </div>
          <button onClick={toggleFullscreen} style={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white', padding: '4px 8px', borderRadius: '4px' }}>全画面</button>
        </div>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>+</div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '10px' }}>
          {/* ジョイスティック（移動） */}
          <div 
            style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', pointerEvents: 'auto' }}
            onTouchMove={handleJoystick}
            onTouchEnd={() => { state.current.moveX = 0; state.current.moveZ = 0; }}
          />

          {/* ジャンプボタン（右下） */}
          <div 
            onPointerDown={handleJump}
            style={{ 
              width: '60px', height: '60px', borderRadius: '10px', 
              backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '12px', pointerEvents: 'auto'
            }}
          >JUMP</div>
        </div>
      </div>
    </div>
  );
    }
