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
    velocity: 0, // ジャンプ・重力用
    isGrounded: true,
    // タッチ管理
    rightTouchId: null as number | null,
    touchStartX: 0, touchStartY: 0,
    touchStartTime: 0,
  });

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

      // --- アクション関数 (内部用) ---
      const performAction = (isDelete: boolean) => {
        const { raycaster, camera, scene, ground } = state.current;
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
            const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x8b4513 }));
            box.position.copy(target.point).add(target.face.normal.multiplyScalar(0.5));
            box.position.set(Math.round(box.position.x), Math.round(box.position.y), Math.round(box.position.z));
            scene.add(box);
            if (window.navigator.vibrate) window.navigator.vibrate(20);
          }
        }
      };

      // --- タッチイベント (右画面全体) ---
      const handleTouch = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        // 右半分エリア判定
        if (t.clientX > window.innerWidth / 2) {
          if (e.type === 'touchstart') {
            state.current.rightTouchId = t.identifier;
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
            state.current.touchStartTime = Date.now();
          } else if (e.type === 'touchmove' && t.identifier === state.current.rightTouchId) {
            const dx = t.clientX - state.current.touchStartX;
            const dy = t.clientY - state.current.touchStartY;
            state.current.yaw -= dx * 0.005;
            state.current.pitch -= dy * 0.005;
            state.current.pitch = Math.max(-1.5, Math.min(1.5, state.current.pitch));
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
          } else if (e.type === 'touchend' && t.identifier === state.current.rightTouchId) {
            const duration = Date.now() - state.current.touchStartTime;
            // 距離が近ければタップ/長押し判定
            const dist = Math.sqrt(Math.pow(t.clientX - state.current.touchStartX, 2) + Math.pow(t.clientY - state.current.touchStartY, 2));
            if (dist < 10) {
              performAction(duration > 500); // 500ms以上なら破壊
            }
            state.current.rightTouchId = null;
          }
        }
      };

      window.addEventListener('touchstart', handleTouch);
      window.addEventListener('touchmove', handleTouch, { passive: false });
      window.addEventListener('touchend', handleTouch);

      // --- 物理ループ ---
      const animate = () => {
        requestAnimationFrame(animate);
        const s = state.current;
        if (s.camera) {
          s.camera.rotation.order = 'YXZ';
          s.camera.rotation.y = s.yaw;
          s.camera.rotation.x = s.pitch;

          // 移動
          if (s.moveX !== 0 || s.moveZ !== 0) {
            const dir = new THREE.Vector3(s.moveX, 0, s.moveZ).applyQuaternion(s.camera.quaternion);
            dir.y = 0;
            s.camera.position.addScaledVector(dir.normalize(), 0.15);
          }

          // 重力とジャンプ
          s.velocity -= 0.015; // 重力加速度
          s.camera.position.y += s.velocity;

          if (s.camera.position.y <= 2) { // 地面の高さ制限
            s.camera.position.y = 2;
            s.velocity = 0;
            s.isGrounded = true;
          } else {
            s.isGrounded = false;
          }
        }
        renderer.render(scene, camera);
      };
      animate();

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    };
    document.head.appendChild(script);
  }, []);

  const handleJump = () => {
    if (state.current.isGrounded) {
      state.current.velocity = 0.3; // ジャンプ力
    }
  };

  const handleJoystick = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const dx = touch.clientX - (rect.left + rect.width/2);
    const dy = touch.clientY - (rect.top + rect.height/2);
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
        
        <div style={{ display: 'flex', justifyContent: 'space-between', pointerEvents: 'auto' }}>
          <div style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px' }}>
            TompeiCraft v0.4<br/>右画面タップ:配置 / 長押し:破壊
          </div>
          <button onClick={toggleFullscreen} style={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white', padding: '5px 10px', borderRadius: '5px' }}>
            {isFullscreen ? '窓表示' : '全画面'}
          </button>
        </div>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '24px', opacity: 0.5 }}>+</div>

        {/* 下部操作UI */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '20px' }}>
          
          {/* 左：360度ジョイスティック */}
          <div 
            style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', pointerEvents: 'auto' }}
            onTouchMove={handleJoystick}
            onTouchEnd={() => { state.current.moveX = 0; state.current.moveZ = 0; }}
          />

          {/* 右：ジャンプボタン */}
          <div 
            onClick={handleJump}
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', 
              backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', pointerEvents: 'auto'
            }}
          >
            JUMP
          </div>

        </div>
      </div>
    </div>
  );
              }
