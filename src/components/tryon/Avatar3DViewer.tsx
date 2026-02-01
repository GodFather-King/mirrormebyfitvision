import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Loader2, Sparkles, RefreshCw, User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { AvatarMeasurements } from '@/hooks/useAvatar';

interface Avatar3DViewerProps {
  avatarUrl: string | null;
  tryOnUrl: string | null;
  isTryingOn: boolean;
  isLoading: boolean;
  hasAvatar: boolean;
  currentItemName?: string | null;
  onClearTryOn?: () => void;
  onCreateAvatar?: () => void;
  className?: string;
  measurements?: AvatarMeasurements | null;
}

// Avatar display using the AI-generated image (which already looks like the user)
// Displayed on a curved cylinder for 3D depth effect
const AvatarDisplay = ({ 
  avatarTexture, 
  tryOnTexture,
  measurements 
}: { 
  avatarTexture: THREE.Texture | null;
  tryOnTexture: THREE.Texture | null;
  measurements?: AvatarMeasurements | null;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate body scale from measurements for slight depth adjustments
  const bodyScale = useMemo(() => {
    if (!measurements) return { width: 1, height: 1.7, depth: 0.3 };
    return {
      width: (measurements.shoulders_cm || 44) / 44,
      height: (measurements.height_cm || 170) / 170,
      depth: 0.3 + ((measurements.chest_cm || 92) - 92) / 200,
    };
  }, [measurements]);

  // Subtle breathing animation
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle breathing motion
      const breathe = Math.sin(state.clock.elapsedTime * 1.5) * 0.003;
      groupRef.current.scale.x = 1 + breathe;
      groupRef.current.scale.y = 1 + breathe * 0.5;
    }
  });

  // Use try-on texture if available, otherwise avatar texture
  const displayTexture = tryOnTexture || avatarTexture;

  // Create material with the avatar/try-on image
  const material = useMemo(() => {
    if (displayTexture) {
      displayTexture.colorSpace = THREE.SRGBColorSpace;
      displayTexture.minFilter = THREE.LinearFilter;
      displayTexture.magFilter = THREE.LinearFilter;
      
      return new THREE.MeshStandardMaterial({
        map: displayTexture,
        transparent: true,
        alphaTest: 0.1,
        roughness: 0.4,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x333344),
      roughness: 0.5,
    });
  }, [displayTexture]);

  // Create a slightly curved geometry for 3D depth effect
  const geometry = useMemo(() => {
    // Create a curved plane (cylinder segment) for depth
    const geo = new THREE.CylinderGeometry(
      0.8, // radius top
      0.8, // radius bottom
      1.6 * bodyScale.height, // height
      32, // radial segments
      1, // height segments
      true, // open ended
      -Math.PI * 0.15, // start angle
      Math.PI * 0.3 // sweep angle (front facing portion)
    );
    
    // Flip UVs for proper texture mapping
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setX(i, 1 - uvs.getX(i));
    }
    
    return geo;
  }, [bodyScale.height]);

  if (!displayTexture) {
    return (
      <group ref={groupRef} position={[0, 0.8, 0]}>
        {/* Placeholder silhouette */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.25, 1, 16, 32]} />
          <meshStandardMaterial color="#333344" roughness={0.7} />
        </mesh>
        {/* Head placeholder */}
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#333344" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[0, 0.8, 0]}>
      {/* Main avatar image on curved surface */}
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        material={material}
        rotation={[0, Math.PI, 0]}
      />
      
      {/* Back side - slightly darker/mirrored for 360° effect */}
      <mesh 
        geometry={geometry} 
        rotation={[0, 0, 0]}
      >
        <meshStandardMaterial
          map={displayTexture}
          transparent
          alphaTest={0.1}
          roughness={0.5}
          metalness={0.0}
          side={THREE.DoubleSide}
          color="#888888"
        />
      </mesh>
      
      {/* Side panels for smoother transitions */}
      <mesh position={[0.4, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.3, 1.6 * bodyScale.height]} />
        <meshStandardMaterial
          color="#222233"
          transparent
          opacity={0.6}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[-0.4, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.3, 1.6 * bodyScale.height]} />
        <meshStandardMaterial
          color="#222233"
          transparent
          opacity={0.6}
          roughness={0.8}
        />
      </mesh>
      
      {/* Floor shadow */}
      <mesh 
        position={[0, -0.85 * bodyScale.height, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.4, 32]} />
        <meshStandardMaterial 
          color="#000000" 
          transparent 
          opacity={0.3}
        />
      </mesh>
    </group>
  );
};

// Loading indicator inside canvas
const CanvasLoader = ({ message }: { message?: string }) => (
  <Html center>
    <div className="flex flex-col items-center gap-2 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{message || 'Loading 3D...'}</span>
    </div>
  </Html>
);

// Try-on overlay effect
const TryOnOverlay = ({ itemName }: { itemName?: string | null }) => (
  <Html center>
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-primary/20 animate-ping absolute inset-0" />
        <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center relative">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </div>
      <p className="text-sm font-medium">Trying on...</p>
      {itemName && <p className="text-xs text-muted-foreground">{itemName}</p>}
    </div>
  </Html>
);

// Scene with avatar
const AvatarScene = ({ 
  avatarUrl, 
  tryOnUrl, 
  isTryingOn,
  measurements,
  controlsRef,
}: { 
  avatarUrl: string | null;
  tryOnUrl: string | null;
  isTryingOn: boolean;
  measurements?: AvatarMeasurements | null;
  controlsRef: React.RefObject<any>;
}) => {
  const [avatarTexture, setAvatarTexture] = useState<THREE.Texture | null>(null);
  const [tryOnTexture, setTryOnTexture] = useState<THREE.Texture | null>(null);

  // Load avatar texture
  useEffect(() => {
    if (avatarUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        avatarUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          setAvatarTexture(texture);
        },
        undefined,
        (error) => console.error('Error loading avatar texture:', error)
      );
    }
  }, [avatarUrl]);

  // Load try-on texture
  useEffect(() => {
    if (tryOnUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        tryOnUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          setTryOnTexture(texture);
        },
        undefined,
        (error) => console.error('Error loading try-on texture:', error)
      );
    } else {
      setTryOnTexture(null);
    }
  }, [tryOnUrl]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 3, -3]} intensity={0.4} />
      <pointLight position={[0, 2, 2]} intensity={0.5} color="#ffeedd" />
      <pointLight position={[0, 0, -2]} intensity={0.3} color="#aaccff" />
      
      {/* Environment for reflections */}
      <Environment preset="studio" />
      
      {/* Ground plane for shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
      </mesh>
      
      {/* Avatar display with user's likeness */}
      <AvatarDisplay 
        avatarTexture={avatarTexture} 
        tryOnTexture={tryOnTexture}
        measurements={measurements}
      />
      
      {/* Orbit controls for touch rotation */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        enableRotate={!isTryingOn}
        minDistance={0.8}
        maxDistance={3}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI - Math.PI / 6}
        rotateSpeed={0.8}
        zoomSpeed={0.5}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_ROTATE,
        }}
      />
    </>
  );
};

const Avatar3DViewer = ({
  avatarUrl,
  tryOnUrl,
  isTryingOn,
  isLoading,
  hasAvatar,
  currentItemName,
  onClearTryOn,
  onCreateAvatar,
  className = '',
  measurements,
}: Avatar3DViewerProps) => {
  const controlsRef = useRef<any>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.multiplyScalar(0.85);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.multiplyScalar(1.15);
      controlsRef.current.update();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("relative w-full aspect-[3/4] glass-card overflow-hidden flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading avatar...</span>
        </div>
      </div>
    );
  }

  // No avatar state
  if (!hasAvatar) {
    return (
      <div className={cn("relative w-full aspect-[3/4] glass-card overflow-hidden flex items-center justify-center", className)}>
        <div className="text-center p-6">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">Create Your 3D Avatar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a photo to generate your 3D avatar
          </p>
          {onCreateAvatar && (
            <Button onClick={onCreateAvatar} className="bg-gradient-to-r from-primary to-secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Create Avatar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full aspect-[3/4] glass-card overflow-hidden", className)}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1, 2], fov: 45 }}
        onCreated={() => setCanvasReady(true)}
        gl={{ antialias: true, alpha: true }}
        shadows
        style={{ touchAction: 'none' }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <AvatarScene 
            avatarUrl={avatarUrl}
            tryOnUrl={tryOnUrl}
            isTryingOn={isTryingOn}
            measurements={measurements}
            controlsRef={controlsRef}
          />
          {isTryingOn && <TryOnOverlay itemName={currentItemName} />}
        </Suspense>
      </Canvas>

      {/* Touch hint overlay */}
      {canvasReady && !isTryingOn && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 glass-card rounded-full text-[10px] text-muted-foreground pointer-events-none animate-pulse">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 8V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
            <path d="M10 10.76a2 2 0 0 0-1.11.63L7 14v4l-2 2" />
            <path d="M7 20h10" />
            <path d="M12 22v-2" />
            <path d="M14 10v2a2 2 0 0 0 4 0v-2a2 2 0 0 0-4 0z" />
          </svg>
          Drag to rotate 360° • Pinch to zoom
        </div>
      )}

      {/* Try-on badge */}
      {tryOnUrl && !isTryingOn && (
        <div className="absolute top-3 left-3 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Virtual Try-On
          </div>
        </div>
      )}

      {/* 3D badge */}
      <div className="absolute top-3 right-3 z-20">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full glass-card text-[10px] font-medium text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          3D
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <button 
          onClick={handleZoomOut}
          className="w-8 h-8 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleReset}
          className="w-8 h-8 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Reset view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleZoomIn}
          className="w-8 h-8 glass-card flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        
        {tryOnUrl && !isTryingOn && onClearTryOn && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearTryOn}
            className="ml-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Ready indicator */}
      {!tryOnUrl && !isTryingOn && hasAvatar && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Select an item to try on</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Avatar3DViewer;
