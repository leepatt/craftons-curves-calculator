'use client';

import React, { useMemo, useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Square, Box } from 'lucide-react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Material interface
interface Material {
  id: string;
  name: string;
  price: number;
  sheet_width: number;
  sheet_height: number;
  thickness: number;
  texture: string;
}

interface BoxBuilderVisualizerProps {
  width?: number;
  depth?: number;
  height?: number;
  dimensionsType?: 'inside' | 'outside';
  boxType?: 'open-top' | 'closed-lid';
  joinType?: 'butt-join' | 'finger-join';
  material?: Material;
}

// View Controls Component
interface ViewControlsProps {
  setTopView: () => void;
  resetCamera: () => void;
  is3DView: boolean;
}

const ViewControls: React.FC<ViewControlsProps> = ({ setTopView, resetCamera, is3DView }) => {
  const toggleView = () => {
    if (is3DView) {
      setTopView();
    } else {
      resetCamera();
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={toggleView} 
        title={is3DView ? "Switch to 2D View" : "Switch to 3D View"}
        className="h-14 w-14 p-0 border-gray-300"
      >
        {is3DView ? (
          <Square className="h-7 w-7 text-gray-500" style={{stroke: "#9ca3af"}} />
        ) : (
          <Box className="h-7 w-7 text-gray-500" style={{strokeDasharray: "2,2", stroke: "#9ca3af"}} />
        )}
      </Button>
    </div>
  );
};

// Dimension Label Component
interface DimensionLabelProps {
  position: [number, number, number];
  text: string;
  color?: string;
}

const DimensionLabel: React.FC<DimensionLabelProps> = ({ position, text, color = "#374151" }) => {
  return (
    <Html position={position} center>
      <div
        className="bg-white/90 backdrop-blur-sm border border-gray-300 rounded px-2 py-1 text-xs font-medium shadow-sm pointer-events-none"
        style={{ color }}
      >
        {text}
      </div>
    </Html>
  );
};

// 3D Box Component
interface BoxMeshProps {
  width: number;
  depth: number;
  height: number;
  boxType: 'open-top' | 'closed-lid';
  joinType: 'butt-join' | 'finger-join';
  material?: Material;
  scaleFactor: number;
  showDimensions: boolean;
}

const BoxMesh: React.FC<BoxMeshProps> = ({ 
  width, 
  depth, 
  height, 
  boxType, 
  joinType, 
  material,
  scaleFactor,
  showDimensions 
}) => {
  const scaledWidth = width / scaleFactor;
  const scaledDepth = depth / scaleFactor;
  const scaledHeight = height / scaleFactor;
  const scaledThickness = (material?.thickness || 18) / scaleFactor;
  
  // Material properties
  const materialColor = material?.id === 'mdf' ? '#CD853F' : 
                       material?.id === 'plywood' ? '#DEB887' : 
                       material?.id === 'formply' ? '#D2B48C' : '#CD853F';
  
  const materialProps = {
    color: materialColor,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  };

  // Finger joint details
  const fingerJointDetail = joinType === 'finger-join' ? (
    <group>
      {/* Add some visual detail for finger joints */}
      <Line
        points={[
          [-scaledWidth/2, -scaledHeight/2, scaledDepth/2],
          [-scaledWidth/2, scaledHeight/2, scaledDepth/2],
        ]}
        color="#8B4513"
        lineWidth={2}
      />
      <Line
        points={[
          [scaledWidth/2, -scaledHeight/2, scaledDepth/2],
          [scaledWidth/2, scaledHeight/2, scaledDepth/2],
        ]}
        color="#8B4513"
        lineWidth={2}
      />
    </group>
  ) : null;

  return (
    <group>
      {/* Bottom - with actual thickness */}
      <mesh position={[0, -scaledHeight/2 - scaledThickness/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[scaledWidth, scaledThickness, scaledDepth]} />
        <meshLambertMaterial {...materialProps} />
      </mesh>
      
      {/* Front - with actual thickness */}
      <mesh position={[0, 0, scaledDepth/2 + scaledThickness/2]} castShadow receiveShadow>
        <boxGeometry args={[scaledWidth, scaledHeight, scaledThickness]} />
        <meshLambertMaterial {...materialProps} />
      </mesh>
      
      {/* Back - with actual thickness */}
      <mesh position={[0, 0, -scaledDepth/2 - scaledThickness/2]} castShadow receiveShadow>
        <boxGeometry args={[scaledWidth, scaledHeight, scaledThickness]} />
        <meshLambertMaterial {...materialProps} />
      </mesh>
      
      {/* Left - with actual thickness */}
      <mesh position={[-scaledWidth/2 - scaledThickness/2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[scaledThickness, scaledHeight, scaledDepth]} />
        <meshLambertMaterial {...materialProps} />
      </mesh>
      
      {/* Right - with actual thickness */}
      <mesh position={[scaledWidth/2 + scaledThickness/2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[scaledThickness, scaledHeight, scaledDepth]} />
        <meshLambertMaterial {...materialProps} />
      </mesh>
      
      {/* Top (only if closed lid) - with actual thickness */}
      {boxType === 'closed-lid' && (
        <mesh position={[0, scaledHeight/2 + scaledThickness/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[scaledWidth, scaledThickness, scaledDepth]} />
          <meshLambertMaterial {...materialProps} />
        </mesh>
      )}
      
      {/* Finger joint details */}
      {fingerJointDetail}
      
      {/* Dimension labels */}
      {showDimensions && (
        <>
          <DimensionLabel 
            position={[0, -scaledHeight/2 - scaledThickness - 0.4, scaledDepth/2 + scaledThickness + 0.3]} 
            text={`Width: ${width}mm`} 
          />
          <DimensionLabel 
            position={[scaledWidth/2 + scaledThickness + 0.3, -scaledHeight/2 - scaledThickness - 0.4, 0]} 
            text={`Depth: ${depth}mm`} 
          />
          <DimensionLabel 
            position={[scaledWidth/2 + scaledThickness + 0.3, 0, scaledDepth/2 + scaledThickness + 0.3]} 
            text={`Height: ${height}mm`} 
          />
          <DimensionLabel 
            position={[0, 0, scaledDepth/2 + scaledThickness + 0.5]} 
            text={`Material: ${material?.thickness || 18}mm thick`} 
          />
        </>
      )}
    </group>
  );
};

export const BoxBuilderVisualizer: React.FC<BoxBuilderVisualizerProps> = ({
  width = 420,
  depth = 400,
  height = 400,
  dimensionsType = 'inside',
  boxType = 'open-top',
  joinType = 'butt-join',
  material
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [is3DView, setIs3DView] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  
  // Scale factor for visualization
  const scaleFactor = 200;
  
  // Calculate maximum dimension for camera positioning
  const maxDimension = useMemo(() => {
    const maxSide = Math.max(width, depth, height) / scaleFactor;
    return maxSide * 1.5;
  }, [width, depth, height, scaleFactor]);
  
  // Camera control functions
  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object as THREE.PerspectiveCamera;
      
      const baseDistance = maxDimension * 2;
      
      // Set 3/4 perspective view
      const newX = baseDistance * 0.7;
      const newY = baseDistance * 0.5;
      const newZ = baseDistance * 0.7;
      
      camera.position.set(newX, newY, newZ);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      setIs3DView(true);
    }
  }, [maxDimension]);
  
  const setTopView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.setAzimuthalAngle(0);
      controlsRef.current.setPolarAngle(0);
      
      const camera = controlsRef.current.object;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.position.set(0, maxDimension * 3, 0);
        camera.updateProjectionMatrix();
      }
      
      controlsRef.current.update();
      setIs3DView(false);
    }
  }, [maxDimension]);
  
  // Set initial view
  useEffect(() => {
    if (controlsRef.current && !is3DView) {
      setTopView();
    }
  }, [setTopView, is3DView]);
  
  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, maxDimension * 3, 0], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={0.8} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.3} />
        <hemisphereLight args={["#87CEEB", "#8B4513", 0.3]} />
        
        {/* Ground plane with shadow reception */}
        <mesh 
          position={[0, -height/(scaleFactor*2) - (material?.thickness || 18)/scaleFactor - 0.6, 0]} 
          rotation={[-Math.PI/2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[maxDimension * 6, maxDimension * 6]} />
          <meshLambertMaterial color="#f8fafc" transparent opacity={0.8} />
        </mesh>
        
        {/* Ground grid */}
        <gridHelper 
          args={[maxDimension * 4, 20]} 
          position={[0, -height/(scaleFactor*2) - (material?.thickness || 18)/scaleFactor - 0.5, 0]}
          material-color="#d1d5db"
          material-opacity={0.5}
          material-transparent
        />
        
        {/* 3D Box */}
        <Suspense fallback={null}>
          <BoxMesh
            width={width}
            depth={depth}
            height={height}
            boxType={boxType}
            joinType={joinType}
            material={material}
            scaleFactor={scaleFactor}
            showDimensions={showDimensions}
          />
        </Suspense>
        
        {/* Controls */}
        <OrbitControls 
          ref={controlsRef}
          enableDamping 
          dampingFactor={0.1}
          minDistance={0.5}
          maxDistance={maxDimension * 10}
          target={[0, 0, 0]}
          makeDefault
          enableRotate={is3DView}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
      
      {/* View Controls */}
      <ViewControls
        resetCamera={resetCamera}
        setTopView={setTopView}
        is3DView={is3DView}
      />
      
      {/* Dimension Toggle */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDimensions(!showDimensions)}
          title="Toggle Dimensions"
          className="h-10 px-3 border-gray-300"
        >
          📏 {showDimensions ? 'Hide' : 'Show'} Dimensions
        </Button>
      </div>
    </>
  );
};
