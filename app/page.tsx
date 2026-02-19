"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, PointerLockControls, Stars, PerspectiveCamera } from "@react-three/drei";
import { Physics, useBox, useSphere } from "@react-three/cannon";
import * as THREE from "three";

// --- Types ---
type BlockType = "grass" | "dirt" | "stone" | "glass" | "wood";

interface BlockProps {
  position: [number, number, number];
  type: BlockType;
}

// --- Texture/Material Helper ---
// フリーのテクスチャ（OpenGameArtなど）を想定したマテリアル設定
// 今回は即時利用可能なように、標準マテリアルに粗さや凹凸感を加えた設定にしています
const getMaterial = (type: BlockType) => {
  const loader = new THREE.TextureLoader();
  
  // 参考: フリー素材URL（必要に応じて差し替え可能）
  // 例: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg"
  
  switch (type) {
    case "grass": return <meshStandardMaterial color="#5d994d" roughness={0.8} metalness={0.1} />;
    case "dirt": return <meshStandardMaterial color="#73533a" roughness={1} />;
    case "stone": return <meshStandardMaterial color="#808080" roughness={0.9} metalness={0.2} />;
    case "glass": return <meshStandardMaterial color="#a0d8ef" transparent opacity={0.6} roughness={0.1} />;
    case "wood": return <meshStandardMaterial color="#7a5230" roughness={0.7} />;
    default: return <meshStandardMaterial color="white" />;
  }
};

// --- Components ---

// 個別のブロック
const Block = ({ position, type }: BlockProps) => {
  const [ref] = useBox(() => ({
    type: "Static",
    position,
  }));

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      {getMaterial(type)}
    </mesh>
  );
};

// 床
const Ground = () => {
  const [ref] = useBox(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.5, 0],
    args: [100, 100, 1],
  }));

  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#404040" roughness={0.8} />
    </mesh>
  );
};

// プレイヤー/カメラ制御
const Player = () => {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: "Dynamic",
    position: [0, 2, 0],
    fixedRotation: true,
  }));

  const velocity = useRef([0, 0, 0]);
  useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api.velocity]);

  const pos = useRef([0, 0, 0]);
  useEffect(() => api.position.subscribe((p) => (pos.current = p)), [api.position]);

  return (
    <>
      <PerspectiveCamera makeDefault position={pos.current} />
      <PointerLockControls />
      {/* 簡易的な移動ロジックは省略（必要に応じて以前の移動コードを統合可能） */}
    </>
  );
};

// --- Main Page Component ---
export default function GammaPage() {
  const [blocks, setBlocks] = useState<BlockProps[]>([
    { position: [2, 0, 2], type: "grass" },
    { position: [2, 1, 2], type: "stone" },
    { position: [3, 0, 2], type: "wood" },
  ]);

  const [selectedBlock, setSelectedBlock] = useState<BlockType>("grass");

  // 全画面表示の修正 (Pointer Lock APIの呼び出し)
  const handleCanvasClick = useCallback(() => {
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  }, []);

  return (
    <div className="relative w-full h-screen bg-black" onClick={handleCanvasClick}>
      {/* 3D World */}
      <Canvas shadows>
        <Sky sunPosition={[100, 100, 20]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} castShadow intensity={1} />
        
        <Physics gravity={[0, -9.81, 0]}>
          <Player />
          <Ground />
          {blocks.map((block, index) => (
            <Block key={index} {...block} />
          ))}
        </Physics>
      </Canvas>

      {/* UI: 十字レティクル */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-4 h-4 border-2 border-white rounded-full opacity-50" />
      </div>

      {/* UI: ホットバー (位置をさらに下へ調整) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
        {(["grass", "dirt", "stone", "wood", "glass"] as BlockType[]).map((type) => (
          <button
            key={type}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBlock(type);
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              selectedBlock === type 
                ? "border-2 border-blue-400 scale-110 bg-white/20" 
                : "border border-white/10 hover:bg-white/10"
            }`}
          >
            <div 
              className="w-8 h-8 rounded-sm shadow-inner" 
              style={{ 
                backgroundColor: 
                  type === "grass" ? "#5d994d" : 
                  type === "dirt" ? "#73533a" : 
                  type === "stone" ? "#808080" : 
                  type === "wood" ? "#7a5230" : "#a0d8ef" 
              }}
            />
          </button>
        ))}
      </div>

      {/* 操作ガイド */}
      <div className="absolute top-4 left-4 text-white/70 text-sm font-mono pointer-events-none">
        <p>BETA v0.2 - Project Gamma</p>
        <p>Click to Lock & Fullscreen</p>
        <p>ESC to Unlock</p>
      </div>
    </div>
  );
}
