"use client";

import React, { useEffect, useRef, useState } from 'react';

// ブロックの定義
const BLOCK_TYPES = [
  { id: 'wood', color: 0x8b4513, label: '木' },
  { id: 'stone', color: 0x808080, label: '石' },
  { id: 'grass', color: 0x7cfc00, label: '草' },
];

export default function TompeiCraft() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(0);

  const state = useRef({
    moveX: 0, moveZ: 0, yaw: 0, pitch: 0,
    camera: null as any, scene: null as any, renderer: null as any, raycaster: null as any,
    ground: null as any, highlightBox: null as any,
    velocity: 0, isGrounded: true,
    rightTouchId: null as number | null,
    touchStartX: 0, touchStartY: 0,
    touchStartTime: 0, hasMoved: false,
    selectedColor: BLOCK_TYPES[0].color,
  });

  // 選択中の色を更新
  useEffect(() => {
    state.current.selectedColor = BLOCK_TYPES[selectedBlockIdx].color;
  }, [selectedBlockIdx]);

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

      // ハイライト
      const hBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.02, 1.02, 1.02),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4 })
      );
      hBox.visible = false;
      scene.add(hBox);
      state.current.highlightBox = hBox;

      // ライト
      scene.add(new THREE.AmbientLight(0xaaaaaa));
      const sun = new THREE.DirectionalLight(0xffffff, 0.7);
      sun.position.set(10, 20, 10);
      scene.add(sun);

      // 地面
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x3a7d3a }));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      state.current.ground = ground;

      const performAction = (isDelete: boolean) => {
        const { raycaster, camera, scene, ground, selectedColor } = state.current;
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const intersects = raycaster.intersectObjects(scene.children.filter((o:any) => o !== state.current.highlightBox));
        
        if (intersects.length > 0) {
          const target = intersects[0];
          if (isDelete) {
            if (target.object !== ground) {
              scene.remove(target.object);
              if (navigator.vibrate) navigator.vibrate(40);
            }
          } else {
            const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: selectedColor }));
            box.position.copy(target.point).add(target.face.normal.multiplyScalar(0.5));
            box.position.set(Math.round(box.position.x), Math.round(box.position.y), Math.round(box.position.z));
            scene.add(box);
            if (navigator.vibrate) navigator.vibrate(15);
          }
        }
      };

      const handleTouch = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (t.clientX > window.innerWidth / 2 || t.clientY < window.innerHeight - 100) {
          if (e.type === 'touchstart') {
            state.current.rightTouchId = t.identifier;
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
            state.current.touchStartTime = Date.now();
            state.current.hasMoved = false;
          } else if (e.type === 'touchmove' && t.identifier === state.current.rightTouchId) {
            const dx = t.clientX - state.current.touchStartX;
            const dy = t.clientY - state.current.touchStartY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) state.current.hasMoved = true;
            state.current.yaw -= dx * 0.005;
            state.current.pitch -= dy * 0.005;
            state.current.pitch = Math.max(-1.5, Math.min(1.5, state.current.pitch));
            state.current.touchStartX = t.clientX;
            state.current.touchStartY = t.clientY;
          } else if (e.type === 'touchend' && t.identifier === state.current.rightTouchId) {
            if (!state.current.hasMoved && (Date.now() - state.current.touchStartTime < 1000)) {
              performAction(Date.now() - state.current.touchStartTime > 400);
            }
            state.current.rightTouchId = null;
          }
        }
      };

      window.addEventListener('touchstart', handleTouch);
      window.addEventListener('touchmove', handleTouch, { passive: false });
      window.addEventListener('touchend', handleTouch);

      const animate = () => {
        requestAnimationFrame(animate);
        const s = state.current;
        if (s.camera) {
          s.camera.rotation.order = 'YXZ';
          s.camera.rotation.y = s.yaw;
          s.camera.rotation.x = s.pitch;

          s.raycaster.setFromCamera({ x: 0, y: 0 }, s.camera);
          const intersects = s.raycaster.intersectObjects(s.scene.children.filter((o:any) => o !== s.highlightBox));
          if (intersects.length > 0 && intersects[0].object !== s.ground) {
             s.highlightBox.position.copy(intersects[0].object.position);
             s.highlightBox.visible = true;
          } else { s.highlightBox.visible = false; }

          if (s.moveX !== 0 || s.moveZ !== 0) {
            const dir = new THREE.Vector3(s.moveX, 0, s.moveZ).applyQuaternion(s.camera.quaternion);
            dir.y = 0;
            s.camera.position.addScaledVector(dir.normalize(), 0.15);
          }
          s.velocity -= 0.015;
          s.camera.position.y += s.velocity;
          if (s.camera.position.y <= 2) { s.camera.position.y = 2; s.velocity = 0; s.isGrounded = true; }
          else { s.isGrounded = false; }
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

  if (!isMounted) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden', touchAction: 'none' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* UI層 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
        
        {/* レティクル */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>+</div>

        {/* 下部UIエリア */}
        <div style={{ marginTop: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* ホットバー（インベントリ） */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', pointerEvents: 'auto' }}>
            {BLOCK_TYPES.map((block, idx) => (
              <div 
                key={block.id}
                onClick={() => setSelectedBlockIdx(idx)}
                style={{ 
                  width: '50px', height: '50px', 
                  backgroundColor: `rgba(${block.color >> 16 & 255}, ${block.color >> 8 & 255}, ${block.color & 255}, 0.8)`,
                  border: selectedBlockIdx === idx ? '3px solid white' : '2px solid rgba(0,0,0,0.3)',
                  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '10px', fontWeight: 'bold', textShadow: '1px 1px 2px black'
                }}
              >
                {block.label}
              </div>
            ))}
          </div>

          {/* 操作ボタン */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px 10px' }}>
            {/* 移動用スティック（透明な反応エリア） */}
            <div 
              style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', pointerEvents: 'auto' }}
              onTouchMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const t = e.touches[0];
                state.current.moveX = (t.clientX - (rect.left + 40)) / 40;
                state.current.moveZ = (t.clientY - (rect.top + 40)) / 40;
              }}
              onTouchEnd={() => { state.current.moveX = 0; state.current.moveZ = 0; }}
            />

            {/* ジャンプ */}
            <div 
              onPointerDown={() => { if (state.current.isGrounded) state.current.velocity = 0.3; }}
              style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'auto' }}
            >
              JUMP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
