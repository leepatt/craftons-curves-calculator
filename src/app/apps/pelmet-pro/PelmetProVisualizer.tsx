'use client';

import React, { useMemo, useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
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
  texture: string;
}

interface PelmetProVisualizerProps {
  length?: number;
  height?: number;
  depth?: number;
  pelmetType?: string;
  addEndCaps?: boolean;
  material?: Material;
  showDimensions?: boolean;
  isPlaceholderMode?: boolean;
  activeFieldHighlight?: string | null;
  ceilingPlasterDeduction?: boolean;
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

// DimensionLabel component for annotations with hover
interface DimensionLabelProps {
  position: [number, number, number];
  text: string;
  color?: string;
  details?: string;
  isActive?: boolean;
  onPointerOver?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerOut?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const DimensionLabel: React.FC<DimensionLabelProps> = ({ 
  position, 
  text, 
  color = "#000000", 
  details, 
  isActive,
  onPointerOver, 
  onPointerOut 
}) => {
  const [hovered, setHovered] = useState(false);
  const showDetails = (hovered || isActive) && details;
  const isVisuallyActive = hovered || isActive;
  
  const handlePointerOver = (event: React.PointerEvent<HTMLDivElement>) => {
    setHovered(true);
    onPointerOver?.(event);
  };

  const handlePointerOut = (event: React.PointerEvent<HTMLDivElement>) => {
    setHovered(false);
    onPointerOut?.(event);
  };
  
  return (
    <Html position={position} center>
      <div 
        style={{ 
          backgroundColor: isVisuallyActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)', 
          padding: '2px 4px', 
          borderRadius: '3px',
          fontSize: isVisuallyActive ? '14px' : '12px',
          fontWeight: 'bold',
          color,
          border: isVisuallyActive ? `1px solid ${color}` : 'none',
          cursor: 'pointer',
          boxShadow: isVisuallyActive ? '0 2px 5px rgba(0,0,0,0.2)' : 'none',
          transition: 'all 0.2s ease'
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {text}
        {showDetails && (
          <div style={{ 
            fontSize: '12px', 
            marginTop: '3px', 
            fontWeight: 'normal', 
            color: '#555', 
            maxWidth: '150px'
          }}>
            {details}
          </div>
        )}
      </div>
    </Html>
  );
};

// Interactive line component with hover effect
interface InteractiveLineProps {
  points: THREE.Vector3[];
  color: string;
  lineWidth: number;
  dashed?: boolean;
  dashSize?: number;
  dashScale?: number;
  gapSize?: number;
  onHover: (hovered: boolean) => void;
  isHovered: boolean;
  isFieldActive?: boolean;
}

const DEFAULT_LINE_COLOR = '#888888';
const ACTIVE_LINE_WIDTH_MULTIPLIER = 1.5;

const InteractiveLine: React.FC<InteractiveLineProps> = ({ 
  points, 
  color,
  lineWidth, 
  dashed = false, 
  dashSize = 0, 
  gapSize = 0, 
  dashScale = 1, 
  onHover, 
  isHovered,
  isFieldActive
}) => {
  const visuallyActive = isHovered || isFieldActive;
  const currentLineColor = visuallyActive ? color : DEFAULT_LINE_COLOR;
  const currentLineWidth = visuallyActive ? lineWidth * ACTIVE_LINE_WIDTH_MULTIPLIER : lineWidth;

  return (
    <Line
      points={points}
      color={currentLineColor}
      lineWidth={currentLineWidth}
      dashed={dashed}
      dashSize={dashSize}
      dashScale={dashScale}
      gapSize={gapSize}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover(false); }}
    />
  );
};

// Custom pelmet panel component
const PelmetPanel: React.FC<{ 
  length: number, 
  height: number, 
  depth: number, 
  thickness: number,
  pelmetType: string,
  addEndCaps: boolean,
  showDimensions?: boolean,
  isPlaceholderMode?: boolean,
  activeFieldHighlight?: string | null,
  scaleFactor: number,
  material?: Material,
  ceilingPlasterDeduction?: boolean
}> = ({ 
  length, 
  height, 
  depth, 
  thickness, 
  pelmetType,
  addEndCaps,
  showDimensions, 
  isPlaceholderMode,
  activeFieldHighlight,
  scaleFactor, 
  material,
  ceilingPlasterDeduction
}) => {
  // States for hover effects
  const [lengthHovered, setLengthHovered] = useState(false);
  const [heightHovered, setHeightHovered] = useState(false);
  const [depthHovered, setDepthHovered] = useState(false);
  
  // Real-world values (without scaling)
  const realLength = length * scaleFactor;
  const realHeight = height * scaleFactor;
  const realDepth = depth * scaleFactor;
  
  // Adjust height for ceiling plaster deduction
  const effectiveHeight = ceilingPlasterDeduction ? Math.max(height - (10 / scaleFactor), 0) : height;
  const realEffectiveHeight = effectiveHeight * scaleFactor;

  // Define desired height for dimension lines in mm
  const DIMENSION_LINE_HEIGHT_MM = 20;
  const DIMENSION_LINE_Z = DIMENSION_LINE_HEIGHT_MM / scaleFactor;

  // Calculate dimension points
  const lengthLine = [
    new THREE.Vector3(-length/2, -DIMENSION_LINE_HEIGHT_MM/scaleFactor, DIMENSION_LINE_Z),
    new THREE.Vector3(length/2, -DIMENSION_LINE_HEIGHT_MM/scaleFactor, DIMENSION_LINE_Z)
  ];

  const heightLine = [
    new THREE.Vector3(-length/2 - DIMENSION_LINE_HEIGHT_MM/scaleFactor, 0, DIMENSION_LINE_Z),
    new THREE.Vector3(-length/2 - DIMENSION_LINE_HEIGHT_MM/scaleFactor, effectiveHeight, DIMENSION_LINE_Z)
  ];

  const depthLine = pelmetType === 'c-channel' ? [
    new THREE.Vector3(length/2 + DIMENSION_LINE_HEIGHT_MM/scaleFactor, 0, 0),
    new THREE.Vector3(length/2 + DIMENSION_LINE_HEIGHT_MM/scaleFactor, 0, depth)
  ] : [
    new THREE.Vector3(-length/2, effectiveHeight + DIMENSION_LINE_HEIGHT_MM/scaleFactor, 0),
    new THREE.Vector3(-length/2, effectiveHeight + DIMENSION_LINE_HEIGHT_MM/scaleFactor, depth)
  ];

  // Create material with hover effect and texture support
  const [hovered, setHovered] = useState(false);
  const isActive = activeFieldHighlight !== null;
  
  // Create material
  const meshMaterial = useMemo(() => {
    if (isPlaceholderMode) {
      return new THREE.MeshStandardMaterial({
        color: "#F5F5F5",
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
    }

    let color = new THREE.Color(1, 1, 1);
    let emissive = new THREE.Color(0, 0, 0);
    let roughness = 0.8;
    const metalness = 0.1;

    if (isActive) {
      color = new THREE.Color(1.05, 1.05, 1.02);
      emissive = new THREE.Color(0.02, 0.015, 0.01);
      roughness = 0.7;
    } else if (hovered) {
      color = new THREE.Color(1.02, 1.02, 1.01);
      roughness = 0.75;
    }

    // Use material-based color
    const materialColor = material?.texture === 'mdf' ? '#F5F5DC' : '#D2B48C';

    return new THREE.MeshStandardMaterial({
      color: materialColor,
      emissive: emissive,
      roughness: roughness,
      metalness: metalness,
      side: THREE.DoubleSide
    });
  }, [isPlaceholderMode, isActive, hovered, material]);

  // Create geometries for different pelmet parts
  const frontGeometry = useMemo(() => 
    new THREE.BoxGeometry(length, effectiveHeight, thickness), 
    [length, effectiveHeight, thickness]
  );

  const leftReturnGeometry = useMemo(() => 
    new THREE.BoxGeometry(thickness, effectiveHeight, depth), 
    [thickness, effectiveHeight, depth]
  );

  const rightReturnGeometry = useMemo(() => 
    new THREE.BoxGeometry(thickness, effectiveHeight, depth), 
    [thickness, effectiveHeight, depth]
  );

  const topReturnGeometry = useMemo(() => 
    new THREE.BoxGeometry(length, thickness, depth), 
    [length, thickness, depth]
  );

  const endCapGeometry = useMemo(() => 
    new THREE.BoxGeometry(thickness, effectiveHeight, depth), 
    [thickness, effectiveHeight, depth]
  );

  return (
    <group>
      {/* Front panel */}
      <mesh 
        geometry={frontGeometry}
        material={meshMaterial}
        position={[0, effectiveHeight/2, 0]}
        castShadow 
        receiveShadow 
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />

      {/* Pelmet type specific returns */}
      {pelmetType === 'c-channel' ? (
        <>
          {/* Left return */}
          <mesh
            geometry={leftReturnGeometry}
            material={meshMaterial}
            position={[-length/2 + thickness/2, effectiveHeight/2, depth/2]}
            castShadow
            receiveShadow
          />
          
          {/* Right return */}
          <mesh
            geometry={rightReturnGeometry}
            material={meshMaterial}
            position={[length/2 - thickness/2, effectiveHeight/2, depth/2]}
            castShadow
            receiveShadow
          />
        </>
      ) : (
        /* L-shaped top return - positioned to create flush joint */
        <mesh
          geometry={topReturnGeometry}
          material={meshMaterial}
          position={[0, effectiveHeight - thickness/2, depth/2]}
          castShadow
          receiveShadow
        />
      )}

      {/* End caps if selected */}
      {addEndCaps && (
        <>
          {/* Left end cap */}
          <mesh
            geometry={endCapGeometry}
            material={meshMaterial}
            position={[-length/2 - thickness/2, effectiveHeight/2, depth/2]}
            castShadow
            receiveShadow
          />
          
          {/* Right end cap */}
          <mesh
            geometry={endCapGeometry}
            material={meshMaterial}
            position={[length/2 + thickness/2, effectiveHeight/2, depth/2]}
            castShadow
            receiveShadow
          />
        </>
      )}

      {/* Dimension Lines and Labels */}
      {showDimensions && (
        <>
          {/* Length dimension */}
          <InteractiveLine
            points={lengthLine}
            color="blue"
            lineWidth={1}
            onHover={setLengthHovered}
            isHovered={lengthHovered}
            isFieldActive={activeFieldHighlight === 'length'}
          />
          <DimensionLabel 
            position={[0, -DIMENSION_LINE_HEIGHT_MM/scaleFactor, DIMENSION_LINE_Z]} 
            text={isPlaceholderMode ? "L:" : `L: ${Math.round(realLength)}mm`}
            color="blue"
            details={isPlaceholderMode ? "Pelmet length" : `Pelmet length`}
            onPointerOver={() => setLengthHovered(true)}
            onPointerOut={() => setLengthHovered(false)}
            isActive={activeFieldHighlight === 'length'}
          />

          {/* Height dimension */}
          <InteractiveLine
            points={heightLine}
            color="green" 
            lineWidth={1}
            onHover={setHeightHovered}
            isHovered={heightHovered}
            isFieldActive={activeFieldHighlight === 'height'}
          />
          <DimensionLabel 
            position={[-length/2 - DIMENSION_LINE_HEIGHT_MM/scaleFactor, effectiveHeight/2, DIMENSION_LINE_Z]}
            text={isPlaceholderMode ? "H:" : `H: ${Math.round(realEffectiveHeight)}mm`}
            color="green"
            details={isPlaceholderMode ? "Front panel height" : `Front panel height${ceilingPlasterDeduction ? ' (plaster deducted)' : ''}`}
            onPointerOver={() => setHeightHovered(true)}
            onPointerOut={() => setHeightHovered(false)}
            isActive={activeFieldHighlight === 'height'}
          />
                    
          {/* Depth dimension */}
          <InteractiveLine
            points={depthLine}
            color="red"
            lineWidth={1}
            onHover={setDepthHovered}
            isHovered={depthHovered}
            isFieldActive={activeFieldHighlight === 'depth'}
          />
          <DimensionLabel 
            position={
              pelmetType === 'c-channel' 
                ? [length/2 + DIMENSION_LINE_HEIGHT_MM/scaleFactor, 0, depth/2]
                : [-length/2, effectiveHeight + DIMENSION_LINE_HEIGHT_MM/scaleFactor, depth/2]
            }
            text={isPlaceholderMode ? "D:" : `D: ${Math.round(realDepth)}mm`}
            color="red"
            details={isPlaceholderMode ? "Return depth" : `Return depth`}
            onPointerOver={() => setDepthHovered(true)}
            onPointerOut={() => setDepthHovered(false)}
            isActive={activeFieldHighlight === 'depth'}
          />
        </>
      )}
    </group>
  );
};

const PelmetProVisualizer: React.FC<PelmetProVisualizerProps> = ({
  length = 2400,
  height = 100,
  depth = 100,
  pelmetType = 'c-channel',
  addEndCaps = false,
  material,
  showDimensions = true,
  isPlaceholderMode = false,
  activeFieldHighlight,
  ceilingPlasterDeduction = false
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [is3DView, setIs3DView] = useState(false); // false = top view (default)
  const previousProps = useRef({ length, height, depth });
  
  // Scale for visualization (scales DOWN by this factor)
  const scaleFactor = 600; // Scales from mm to Three.js units
  const scaledLength = length / scaleFactor;
  const scaledHeight = height / scaleFactor;
  const scaledDepth = depth / scaleFactor;
  const materialThickness = 18; // Default material thickness in mm
  const scaledThickness = materialThickness / scaleFactor;

  // Calculate maximum dimension for centering and sizing
  const maxDimension = useMemo(() => {
    const maxExtent = Math.max(length, height, depth) / scaleFactor;
    const paddingFactor = 1.5;
    return maxExtent * paddingFactor;
  }, [length, height, depth, scaleFactor]);
  
  // Calculate the initial camera distance factor
  const calculateDistanceFactor = useCallback((l: number, h: number, d: number) => {
    let factor = 2.0;
    const maxDim = Math.max(l, h, d);
    if (maxDim > 3000) {
      factor += Math.floor((maxDim - 3000) / 1000) * 0.1; 
    }
    return Math.min(factor, 4.0);
  }, []);

  const initialDistanceFactor = useMemo(() => {
    return calculateDistanceFactor(length, height, depth);
  }, [length, height, depth, calculateDistanceFactor]);
  
  // Return to plan view if any of the inputs changed
  useEffect(() => {
    const hasChanged = 
      previousProps.current.length !== length ||
      previousProps.current.height !== height ||
      previousProps.current.depth !== depth;
    
    if (hasChanged && !is3DView) {
      previousProps.current = { length, height, depth };
    }
  }, [length, height, depth, is3DView]);
  
  // Camera control functions
  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object as THREE.PerspectiveCamera;
      
      const baseDistance = maxDimension * 1.5;

      const newX = baseDistance * 0.6;
      const newY = baseDistance * 0.4;
      const newZ = baseDistance * 0.6;

      camera.position.set(newX, newY, newZ);
      
      controlsRef.current.target.set(0, 0, 0); 
      controlsRef.current.update();
      setIs3DView(true);
    }
  }, [maxDimension]);

  const setTopView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.update();
      
      controlsRef.current.setAzimuthalAngle(0);
      controlsRef.current.setPolarAngle(0);
      
      const camera = controlsRef.current.object;
      if (camera instanceof THREE.PerspectiveCamera) {
        const distanceFactor = calculateDistanceFactor(length, height, depth);
        camera.position.set(0, maxDimension * distanceFactor, 0);
        camera.updateProjectionMatrix();
      }
      
      controlsRef.current.update();
      setIs3DView(false);
    }
  }, [maxDimension, length, height, depth, calculateDistanceFactor]);
  
  // Set to plan view on initial render and when inputs change
  useEffect(() => {
    setTimeout(() => {
      setTopView();
    }, 100);
  }, [setTopView]);
  
  // Update view after dimension changes
  useEffect(() => {
    if (!is3DView) {
      setTopView();
    }
  }, [length, height, depth, setTopView, is3DView]);

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, maxDimension * initialDistanceFactor, 0], fov: 45 }}
        style={{ 
          background: '#ffffff', 
          width: '100%', 
          height: '100%'
        }}
      >
        {/* Enhanced lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[8, 12, 8]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.001}
        />
        <directionalLight 
          position={[-5, 5, -5]} 
          intensity={0.4}
        />
        
        {/* Pelmet Panel */}
        <Suspense fallback={null}>
          <PelmetPanel 
            length={scaledLength} 
            height={scaledHeight} 
            depth={scaledDepth} 
            thickness={scaledThickness}
            pelmetType={pelmetType}
            addEndCaps={addEndCaps}
            showDimensions={showDimensions}
            isPlaceholderMode={isPlaceholderMode}
            activeFieldHighlight={activeFieldHighlight}
            scaleFactor={scaleFactor}
            material={material}
            ceilingPlasterDeduction={ceilingPlasterDeduction}
          />
        </Suspense>
        
        {/* Controls */}
        <OrbitControls 
          ref={controlsRef}
          enableDamping 
          dampingFactor={0.1}
          minDistance={0.1}
          maxDistance={100}
          target={[0, 0, 0]}
          makeDefault
          enableRotate={is3DView}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
      
      {/* View Controls UI */}
      <ViewControls
        resetCamera={resetCamera}
        setTopView={setTopView}
        is3DView={is3DView}
      />
    </>
  );
};

export default PelmetProVisualizer;
