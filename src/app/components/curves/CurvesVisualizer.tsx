import React, { useMemo, useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Square, Box } from 'lucide-react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Material } from '../../types';

interface CurvesVisualizerProps {
  radius?: number;
  width?: number;
  angle?: number;
  materialThickness?: number;
  arcLength?: number;
  chordLength?: number;
  showDimensions?: boolean;
  isPlaceholderMode?: boolean;
  activeFieldHighlight?: string | null;
  isTooLarge?: boolean;
  numSplits?: number;
  splitLinesHovered?: boolean;
  radiusType?: 'internal' | 'external';
  materialId?: string; // Add material ID prop
  materials?: Material[]; // Add materials array prop
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

// Interactive line component with hover effect and flashing capability
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
  isFlashing?: boolean; // Add flashing prop
}

const DEFAULT_LINE_COLOR = '#888888';
const FLASH_COLOR = '#FF6B6B'; // Bright red for flash effect
const ACTIVE_LINE_WIDTH_MULTIPLIER = 1.5;
const FLASH_LINE_WIDTH_MULTIPLIER = 2.5; // Make flashing lines even thicker

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
  isFieldActive,
  isFlashing = false
}) => {
  const visuallyActive = isHovered || isFieldActive;
  const currentLineColor = isFlashing ? FLASH_COLOR : (visuallyActive ? color : DEFAULT_LINE_COLOR);
  const currentLineWidth = isFlashing 
    ? lineWidth * FLASH_LINE_WIDTH_MULTIPLIER 
    : (visuallyActive ? lineWidth * ACTIVE_LINE_WIDTH_MULTIPLIER : lineWidth);

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



// Custom curved panel component - flat on ground plane
const CurvedPanel: React.FC<{ 
  radius: number, 
  width: number, 
  angle: number, 
  thickness: number,
  arcLength?: number,
  chordLength?: number,
  showDimensions?: boolean,
  isPlaceholderMode?: boolean,
  activeFieldHighlight?: string | null,
  scaleFactor: number,
  isTooLarge?: boolean,
  numSplits?: number,
  splitLinesHovered?: boolean,
  radiusType?: 'internal' | 'external',
  materialId?: string,
  materials?: Material[]
}> = ({ 
  radius, 
  width, 
  angle, 
  thickness, 
  arcLength, 
  chordLength, 
  showDimensions, 
  isPlaceholderMode,
  activeFieldHighlight,
  scaleFactor, 
  isTooLarge, 
  numSplits, 
  splitLinesHovered,
  radiusType = 'internal',
  materialId,
  materials
}) => {
  // States for hover effects
  const [radiusHovered, setRadiusHovered] = useState(false);
  const [widthHovered, setWidthHovered] = useState(false);
  const [angleHovered, setAngleHovered] = useState(false);
  const [arcLengthHovered, setArcLengthHovered] = useState(false);
  const [chordLengthHovered, setChordLengthHovered] = useState(false);
  
  // Flash animation state for radiusType changes
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashState, setFlashState] = useState(false);
  const previousRadiusType = useRef(radiusType);
  
  // Detect radiusType changes and trigger flash animation
  useEffect(() => {
    if (previousRadiusType.current !== radiusType) {
      setIsFlashing(true);
      setFlashState(true);
      
      // Create pulsing effect - flash on/off 3 times
      let flashCount = 0;
      const maxFlashes = 6; // 3 on/off cycles
      
      const flashInterval = setInterval(() => {
        flashCount++;
        setFlashState(prev => !prev);
        
        if (flashCount >= maxFlashes) {
          clearInterval(flashInterval);
          setIsFlashing(false);
          setFlashState(false);
        }
      }, 150); // Toggle every 150ms
      
      // Update previous radiusType
      previousRadiusType.current = radiusType;
      
      return () => clearInterval(flashInterval);
    }
  }, [radiusType]);
  
  // Real-world values (without scaling)
  const realRadius = radius * scaleFactor;
  const realWidth = width * scaleFactor;
  const realArcLength = arcLength ? arcLength : 0;
  const realChordLength = chordLength ? chordLength : 0;
  
  // Create a flat curved shape with high resolution for smooth curves
  const shape = useMemo(() => {
    const curveShape = new THREE.Shape();
    const innerRadius = radius;
    const outerRadius = radius + width; // Width is the thickness of the curve (radial direction)
    const angleInRad = angle * Math.PI / 180;
    
    // Calculate segments for smooth curves - higher for larger angles
    const segments = Math.max(64, Math.ceil(angle * 2)); // Minimum 64 segments, 2 segments per degree
    
    // Start at inner radius point
    curveShape.moveTo(innerRadius, 0);
    
    // Draw line to outer radius at start
    curveShape.lineTo(outerRadius, 0);
    
    // Draw outer arc manually with high resolution - start from 0 to include the first point
    for (let i = 1; i <= segments; i++) {
      const theta = (i / segments) * angleInRad;
      const x = outerRadius * Math.cos(theta);
      const y = outerRadius * Math.sin(theta);
      curveShape.lineTo(x, y);
    }
    
    // Draw line to inner radius at angle
    curveShape.lineTo(innerRadius * Math.cos(angleInRad), innerRadius * Math.sin(angleInRad));
    
    // Draw inner arc back to start with high resolution - go all the way back to close properly
    for (let i = segments - 1; i >= 1; i--) {
      const theta = (i / segments) * angleInRad;
      const x = innerRadius * Math.cos(theta);
      const y = innerRadius * Math.sin(theta);
      curveShape.lineTo(x, y);
    }
    
    // Close the shape - this will connect back to the starting point
    curveShape.closePath();
    
    return curveShape;
  }, [radius, width, angle]);

  // Extrude settings for the flat shape
  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: thickness, // Material thickness is the extrusion depth
    bevelEnabled: false,
  }), [thickness]);

  // FIRST_EDIT: recenter geometry and capture centerOffset
  const { geometry, centerOffset } = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.computeBoundingBox();
    const bbox = geo.boundingBox!;
    // compute X/Y center of shape
    const offsetX = (bbox.min.x + bbox.max.x) / 2;
    const offsetY = (bbox.min.y + bbox.max.y) / 2;
    // translate geometry to center at origin in shape plane
    geo.translate(-offsetX, -offsetY, 0);
    return {
      geometry: geo,
      centerOffset: new THREE.Vector3(-offsetX, -offsetY, 0)
    };
  }, [shape, extrudeSettings]);

  // Create edges geometry for outline
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  // Calculate dimension points
  const angleInRad = angle * Math.PI / 180;
  const outerR = radius + width;
  
  // Determine which radius to use for guide lines based on radiusType
  const guideRadius = radiusType === 'external' ? outerR : radius;
  
  // Define desired height for dimension lines in mm
  const DIMENSION_LINE_HEIGHT_MM = 20;
  // Calculate scaled Z coordinate based on the scale factor
  const DIMENSION_LINE_Z = DIMENSION_LINE_HEIGHT_MM / scaleFactor;

  // Calculate dimension points 
  const radiusLine = [
    [centerOffset.x, centerOffset.y, DIMENSION_LINE_Z], // Move radius lines to same height as chord length
    [guideRadius + centerOffset.x, centerOffset.y, DIMENSION_LINE_Z] // Use guide radius instead of inner radius
  ];
  const radiusLineEnd = [
      [centerOffset.x, centerOffset.y, DIMENSION_LINE_Z],
      [guideRadius * Math.cos(angleInRad) + centerOffset.x, guideRadius * Math.sin(angleInRad) + centerOffset.y, DIMENSION_LINE_Z] // Use guide radius
  ];
  // Apply fixed height to width line
  const widthLine = [
    [radius + centerOffset.x, centerOffset.y, DIMENSION_LINE_Z], 
    [outerR + centerOffset.x, centerOffset.y, DIMENSION_LINE_Z]
  ];
  
  // Points for angle indicator (at DIMENSION_LINE_Z height)
  const angleArc = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = Math.max(32, Math.ceil(angle / 2)); // Higher resolution for smooth angle arc
    const smallRadius = guideRadius * 0.15; // Use guideRadius instead of radius
    
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * angleInRad;
      // add centerOffset to each point
      points.push(new THREE.Vector3(
        smallRadius * Math.cos(theta) + centerOffset.x,
        smallRadius * Math.sin(theta) + centerOffset.y,
        DIMENSION_LINE_Z
      ));
    }
    
    return points;
  }, [guideRadius, angleInRad, centerOffset, DIMENSION_LINE_Z, angle]); // Update dependencies

  // Chord points with fixed height
  const chordPoints = [
    new THREE.Vector3(guideRadius + centerOffset.x, centerOffset.y, DIMENSION_LINE_Z), 
    new THREE.Vector3(guideRadius * Math.cos(angleInRad) + centerOffset.x, guideRadius * Math.sin(angleInRad) + centerOffset.y, DIMENSION_LINE_Z)
  ];

  // Outer arc line with fixed height - use guide radius for the arc line
  const outerArcPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = Math.max(48, Math.ceil(angle / 2)); // Higher resolution for smooth arc line
    
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * angleInRad;
      points.push(new THREE.Vector3(
        guideRadius * Math.cos(theta) + centerOffset.x,
        guideRadius * Math.sin(theta) + centerOffset.y,
        DIMENSION_LINE_Z // Use fixed Z height
      ));
    }
    
    return points;
  }, [angleInRad, angle, centerOffset, DIMENSION_LINE_Z, guideRadius]); // Update dependencies

  // Create material with hover effect and texture support
  const [hovered, setHovered] = useState(false);
  const isActive = activeFieldHighlight !== null;
  
  // Texture loading directly in CurvedPanel
  const [diffuseTexture, setDiffuseTexture] = useState<THREE.Texture | null>(null);
  
  // Find the material definition
  const material = materials?.find(m => m.id === materialId);
  
  // Load texture directly
  useEffect(() => {
    if (isPlaceholderMode || !materials || materials.length === 0) {
      setDiffuseTexture(null);
      return;
    }
    
    const texturePath = material?.texture_diffuse || '/textures/default.png';
    console.log(`CurvedPanel: Loading texture ${texturePath} for material ${materialId}`);
    
    // Special debugging for plywood
    if (materialId === 'CD-19') {
      console.log('🪵 PLYWOOD DEBUG:', {
        materialId,
        materialName: material?.name,
        texturePath,
        textureScale: material?.texture_scale
      });
    }
    
    const loader = new THREE.TextureLoader();
    loader.load(
      texturePath,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        const scale = material?.texture_scale || [1, 1];
        texture.repeat.set(scale[0], scale[1]);
        
        // Ensure proper color space for realistic textures
        texture.colorSpace = THREE.SRGBColorSpace;
        
        // Special logging for plywood
        if (materialId === 'CD-19') {
          console.log('🪵 PLYWOOD TEXTURE LOADED:', {
            texture,
            scale: scale,
            colorSpace: texture.colorSpace,
            format: texture.format
          });
        }
        
        setDiffuseTexture(texture);
        console.log(`✅ CurvedPanel: Successfully loaded texture: ${texturePath}`);
      },
      undefined,
      (error) => {
        console.error(`❌ CurvedPanel: Failed to load texture: ${texturePath}`, error);
        setDiffuseTexture(null);
      }
    );
  }, [material?.texture_diffuse, material?.texture_scale, isPlaceholderMode, materials, materialId]);
  
  // Create material using Three.js material directly
  const meshMaterial = useMemo(() => {
    console.log('CurvedPanel: Creating material - texture:', !!diffuseTexture, 'placeholder:', isPlaceholderMode);
    
    if (isPlaceholderMode) {
      const material = new THREE.MeshStandardMaterial({
        color: "#F5F5F5",
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
      return material;
    }

    if (!diffuseTexture) {
      console.log('CurvedPanel: No texture, using fallback color');
      const material = new THREE.MeshStandardMaterial({
        color: "#D2B48C",
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
      return material;
    }

    console.log('✅ CurvedPanel: Creating textured material');
    
    let color = new THREE.Color(1, 1, 1);
    let emissive = new THREE.Color(0, 0, 0);
    let roughness = 0.8;
    let metalness = 0.1;

    if (isActive) {
      color = new THREE.Color(1.05, 1.05, 1.02);
      emissive = new THREE.Color(0.02, 0.015, 0.01);
      roughness = 0.7;
    } else if (hovered) {
      color = new THREE.Color(1.02, 1.02, 1.01);
      roughness = 0.75;
    }

    const material = new THREE.MeshStandardMaterial({
      map: diffuseTexture,
      color: color,
      emissive: emissive,
      roughness: roughness,
      metalness: metalness,
      side: THREE.DoubleSide
    });
    
    console.log('✅ Created Three.js material:', material, 'with map:', material.map);
    return material;
  }, [diffuseTexture, isPlaceholderMode, isActive, hovered]);

  return (
    <group rotation={[-Math.PI/2, 0, 0]}> {/* Rotate to lay flat with radius pointing right */}
      {/* Curved Panel with Texture */}
      <mesh 
        geometry={geometry} 
        material={meshMaterial}
        castShadow 
        receiveShadow 
        position={[0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        key={`mesh-${materialId}-${!!diffuseTexture}`} // Force re-render when texture changes
      />
              {/* Edge lines with dynamic color based on active state */}
        <lineSegments geometry={edges} renderOrder={1}>
          <lineBasicMaterial 
            color={
              isPlaceholderMode 
                ? "#A0A0A0" 
                : isActive 
                  ? "#4A4A4A" 
                  : "#654321"
            } 
            linewidth={isActive ? 3.0 : 2.0} 
          />
        </lineSegments>

      {/* Dimension Lines and Labels */}
      {showDimensions && (
        <>
          {/* Radius Lines (Z=0) */}
          <InteractiveLine
            points={radiusLine.map(p => new THREE.Vector3(p[0], p[1], p[2]))}
            color="blue"
            lineWidth={1}
            onHover={setRadiusHovered}
            isHovered={radiusHovered}
            isFieldActive={activeFieldHighlight === 'specifiedRadius'}
            isFlashing={isFlashing && flashState}
          />
          <InteractiveLine
            points={radiusLineEnd.map(p => new THREE.Vector3(p[0], p[1], p[2]))}
            color="blue"
            lineWidth={1}
            onHover={setRadiusHovered}
            isHovered={radiusHovered}
            isFieldActive={activeFieldHighlight === 'specifiedRadius'}
            isFlashing={isFlashing && flashState}
          />
          <DimensionLabel 
            position={[guideRadius * 0.5 + centerOffset.x, centerOffset.y, DIMENSION_LINE_Z]} 
            text={isPlaceholderMode ? "r:" : `r: ${Math.round(realRadius)}mm`}
            color="blue"
            details={isPlaceholderMode ? `${radiusType === 'external' ? 'External' : 'Internal'} dimensions` : `${radiusType === 'external' ? 'External' : 'Internal'} dimensions`}
            onPointerOver={() => setRadiusHovered(true)}
            onPointerOut={() => setRadiusHovered(false)}
            isActive={activeFieldHighlight === 'specifiedRadius'}
          />

          {/* Width Line (Z=DIMENSION_LINE_Z) */}
          <InteractiveLine
            points={widthLine.map(p => new THREE.Vector3(p[0], p[1], p[2]))}
            color="green" 
            lineWidth={1}
            onHover={setWidthHovered}
            isHovered={widthHovered}
            isFieldActive={activeFieldHighlight === 'width'}
          />
          <DimensionLabel 
            position={[radius + width * 0.5 + centerOffset.x, centerOffset.y, DIMENSION_LINE_Z]}
            text={isPlaceholderMode ? "w:" : `w: ${Math.round(realWidth)}mm`}
            color="green"
            details={isPlaceholderMode ? "Curve width" : `Curve width`}
            onPointerOver={() => setWidthHovered(true)}
            onPointerOut={() => setWidthHovered(false)}
            isActive={activeFieldHighlight === 'width'}
          />
                    
          {/* Angle Arc (Z=DIMENSION_LINE_Z) */}
          <InteractiveLine
            points={angleArc}
            color="red"
            lineWidth={1}
            onHover={setAngleHovered}
            isHovered={angleHovered}
            isFieldActive={activeFieldHighlight === 'angle'}
          />
          <DimensionLabel 
            position={[guideRadius * 0.1 + centerOffset.x, guideRadius * 0.1 + centerOffset.y, DIMENSION_LINE_Z]} 
            text={isPlaceholderMode ? "θ:" : `θ: ${angle}°`}
            color="red"
            details={isPlaceholderMode ? "Angle" : `Angle`}
            onPointerOver={() => setAngleHovered(true)}
            onPointerOut={() => setAngleHovered(false)}
            isActive={activeFieldHighlight === 'angle'}
          />
          
          {/* Arc Length Line (Z=DIMENSION_LINE_Z) */}
          {(isPlaceholderMode || arcLength) && (
            <>
              <InteractiveLine
                points={outerArcPoints}
                color="#8844AA" 
                lineWidth={1}
                onHover={setArcLengthHovered}
                isHovered={arcLengthHovered}
                isFieldActive={activeFieldHighlight === 'arcLength'}
                isFlashing={isFlashing && flashState}
              />
              <DimensionLabel 
                position={[
                  guideRadius * Math.cos(angleInRad * 0.5) + centerOffset.x, 
                  guideRadius * Math.sin(angleInRad * 0.5) + centerOffset.y, 
                  DIMENSION_LINE_Z
                ]} 
                text={isPlaceholderMode ? "L:" : `L: ${Math.round(realArcLength)}mm`}
                color="#8844AA"
                details={isPlaceholderMode ? "Arc length" : `Arc length`}
                onPointerOver={() => setArcLengthHovered(true)}
                onPointerOut={() => setArcLengthHovered(false)}
                isActive={activeFieldHighlight === 'arcLength'}
              />
            </>
          )}
          
          {/* Chord Line (Z=DIMENSION_LINE_Z) */}
          {(isPlaceholderMode || chordLength) && (
            <InteractiveLine
              points={chordPoints}
              color="orange"
              lineWidth={1}
              dashed
              dashSize={0.05}
              dashScale={1}
              gapSize={0.05}
              onHover={setChordLengthHovered}
              isHovered={chordLengthHovered}
              isFieldActive={activeFieldHighlight === 'chordLength'}
            />
          )}
          {(isPlaceholderMode || chordLength) && (
            <DimensionLabel 
              position={[
                guideRadius * 0.7 * Math.cos(angleInRad * 0.5) + centerOffset.x, 
                guideRadius * 0.7 * Math.sin(angleInRad * 0.5) + centerOffset.y, 
                DIMENSION_LINE_Z
              ]} 
              text={isPlaceholderMode ? "c:" : `c: ${Math.round(realChordLength)}mm`}
              color="orange"
              details={isPlaceholderMode ? "Chord length" : `Chord length`}
              onPointerOver={() => setChordLengthHovered(true)}
              onPointerOut={() => setChordLengthHovered(false)}
              isActive={activeFieldHighlight === 'chordLength'}
            />
          )}
          
          {/* Split Lines - Draw them at Z=DIMENSION_LINE_Z */}
          {!isPlaceholderMode && isTooLarge && numSplits && numSplits > 1 && (
            <>
              {Array.from({ length: numSplits - 1 }).map((_, i) => {
                const splitAngle = (i + 1) * (angle / numSplits);
                const splitAngleRad = splitAngle * Math.PI / 180;
                // Split lines always go from inner radius to outer radius
                const innerPoint = new THREE.Vector3(
                  radius * Math.cos(splitAngleRad) + centerOffset.x,
                  radius * Math.sin(splitAngleRad) + centerOffset.y,
                  DIMENSION_LINE_Z // Raise to fixed Z height
                );
                const outerPoint = new THREE.Vector3(
                  outerR * Math.cos(splitAngleRad) + centerOffset.x,
                  outerR * Math.sin(splitAngleRad) + centerOffset.y,
                  DIMENSION_LINE_Z // Raise to fixed Z height
                );
                // Define hover styles
                const hoverLineWidth = 5;
                const hoverColor = 'orange';
                const defaultLineWidth = 3;
                const defaultColor = 'red';

                return (
                  <Line // Using non-interactive Line for splits
                    key={`split-${i}`}
                    points={[innerPoint, outerPoint]}
                    color={splitLinesHovered ? hoverColor : defaultColor} // Conditional color
                    lineWidth={splitLinesHovered ? hoverLineWidth : defaultLineWidth} // Conditional line width
                  />
                );
              })}
            </>
          )}
        </>
      )}
    </group>
  );
};

const CurvesVisualizer: React.FC<CurvesVisualizerProps> = ({
  radius = 1200,
  width = 100,
  angle = 90,
  materialThickness = 18,
  arcLength,
  chordLength,
  showDimensions = false,
  isPlaceholderMode = false,
  activeFieldHighlight,
  isTooLarge = false,
  numSplits = 1,
  splitLinesHovered = false,
  radiusType = 'internal',
  materialId,
  materials
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [is3DView, setIs3DView] = useState(false); // false = top view (default)
  const previousProps = useRef({ radius, width, angle, materialThickness });
  
  // Scale for visualization (scales DOWN by this factor)
  const scaleFactor = 600; // Increased to make the part appear larger and reduce empty space
  const scaledRadius = radius / scaleFactor;
  const scaledWidth = width / scaleFactor;
  const scaledThickness = materialThickness / scaleFactor;

  // Calculate maximum dimension for centering and sizing
  const maxDimension = useMemo(() => {
    // Calculate size based on outer radius and angle
    const outerRadius = radius + width;
    const maxExtent = Math.max(
      outerRadius,
      outerRadius * Math.sin(angle * Math.PI / 180)
    ) / scaleFactor;
    
    // Reduce padding further to zoom in and minimize empty margins
    const paddingFactor = angle > 180 ? 1.05 : 1.02;
    return maxExtent * paddingFactor;
  }, [radius, width, angle, scaleFactor]);
  
  // Calculate the initial camera distance factor - make it dependent on size
  const calculateDistanceFactor = useCallback((r: number, w: number, a: number) => {
    // Base factor - reduced for tighter framing
    let factor = 1.5;
    // Scale factor based on radius (more zoom out for larger radius)
    // Example: increase factor by 0.1 for every 1000mm increase over 2000mm
    if (r > 2000) {
      factor += Math.floor((r - 2000) / 1000) * 0.1; 
    }
    // Adjustments based on angle/ratio (reduced for tighter framing)
    const radiusToWidthRatio = w > 0 ? r / w : Infinity;
    if (a < 30) factor = Math.max(factor, 1.5); // Zoom in more for small angles
    else if (a > 180) factor = Math.max(factor, 1.8); // Less padding for large angles
    else if (radiusToWidthRatio > 20) factor = Math.max(factor, 1.7); // Less padding for thin bands

    // Set a max factor to prevent zooming out excessively
    return Math.min(factor, 3.5); // Reduced cap factor for tighter framing
  }, []);

  const initialDistanceFactor = useMemo(() => {
    return calculateDistanceFactor(radius, width, angle);
  }, [radius, width, angle, calculateDistanceFactor]);
  
  // Return to plan view if any of the inputs changed
  useEffect(() => {
    const hasChanged = 
      previousProps.current.radius !== radius ||
      previousProps.current.width !== width ||
      previousProps.current.angle !== angle ||
      previousProps.current.materialThickness !== materialThickness;
    
    if (hasChanged && !is3DView) {
      // Will update view after setTopView is defined
      previousProps.current = { radius, width, angle, materialThickness };
    }
  }, [radius, width, angle, materialThickness, is3DView]);
  
  // Camera control functions
  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object as THREE.PerspectiveCamera;
      
      // Determine a good distance for the 3D view based on the object's size
      const baseDistance = maxDimension * 1.5; // Adjust multiplier for closer/further view

      // Set a 3/4 perspective view position
      const newX = baseDistance * 0.6;
      const newY = baseDistance * 0.4; // Elevation of the camera
      const newZ = baseDistance * 0.6;

      camera.position.set(newX, newY, newZ);
      
      // Ensure the camera is looking at the center of the scene
      controlsRef.current.target.set(0, 0, 0); 
      
      controlsRef.current.update(); // Apply camera changes
      setIs3DView(true); // Enable orbit controls for further interaction
    }
  }, [maxDimension]); // Dependency: maxDimension for positioning

  const setTopView = useCallback(() => {
    if (controlsRef.current) {
      // Reset and set to top view
      controlsRef.current.reset();
      controlsRef.current.update();
      
      // Position directly above with no azimuthal rotation
      controlsRef.current.setAzimuthalAngle(0); // Straight alignment, no rotation
      controlsRef.current.setPolarAngle(0);
      
      // Set zoom to fit the part with padding
      const camera = controlsRef.current.object;
      if (camera instanceof THREE.PerspectiveCamera) {
        // Calculate zoom based on part size and angle
        // Use the dynamic distance factor calculation
        const distanceFactor = calculateDistanceFactor(radius, width, angle);
        
        // Position the camera for best viewing
        camera.position.set(0, maxDimension * distanceFactor, 0);
        camera.updateProjectionMatrix();
      }
      
      controlsRef.current.update();
      setIs3DView(false);
    }
  }, [maxDimension, radius, width, angle, calculateDistanceFactor]);
  
  // Set to plan view on initial render and when inputs change
  useEffect(() => {
    setTimeout(() => {
      setTopView();
    }, 100); // Small delay to ensure the component is fully mounted
  }, [setTopView]);
  
  // Update view after dimension changes
  useEffect(() => {
    if (!is3DView) {
      setTopView();
    }
  }, [radius, width, angle, setTopView, is3DView]);

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
        {/* Enhanced lighting for better texture visibility */}
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
        
        {/* Curved Panel with texture support */}
        <Suspense fallback={null}>
          <CurvedPanel 
            radius={scaledRadius} 
            width={scaledWidth} 
            angle={angle} 
            thickness={scaledThickness}
            arcLength={arcLength}
            chordLength={chordLength}
            showDimensions={showDimensions}
            isPlaceholderMode={isPlaceholderMode}
            activeFieldHighlight={activeFieldHighlight}
            scaleFactor={scaleFactor}
            isTooLarge={isTooLarge}
            numSplits={numSplits}
            splitLinesHovered={splitLinesHovered}
            radiusType={radiusType}
            materialId={materialId}
            materials={materials}
          />
        </Suspense>
        
        {/* Controls */}
        <OrbitControls 
          ref={controlsRef}
          enableDamping 
          dampingFactor={0.1}
          minDistance={0.1}
          maxDistance={100} // Ensure this is the only maxDistance prop
          target={[0, 0, 0]}
          makeDefault
          enableRotate={is3DView} // Only allow rotation in 3D view
          maxPolarAngle={Math.PI / 2} // Restrict to top hemisphere
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

export default CurvesVisualizer; 