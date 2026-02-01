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

// Procedural humanoid body mesh component
const HumanoidBody = ({ 
  photoTexture, 
  clothingTexture,
  measurements 
}: { 
  photoTexture: THREE.Texture | null;
  clothingTexture: THREE.Texture | null;
  measurements?: AvatarMeasurements | null;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate body proportions from measurements
  const bodyScale = useMemo(() => {
    if (!measurements) return { chest: 1, waist: 0.85, hips: 0.95, height: 1.7 };
    const baseChest = 95; // cm reference
    const baseWaist = 80;
    const baseHips = 95;
    return {
      chest: (measurements.chest_cm || baseChest) / baseChest,
      waist: (measurements.waist_cm || baseWaist) / baseWaist * 0.85,
      hips: (measurements.hips_cm || baseHips) / baseHips * 0.95,
      height: (measurements.height_cm || 170) / 170,
    };
  }, [measurements]);

  // Subtle idle animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.01;
    }
  });

  // Create body material
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xe8beac),
      roughness: 0.6,
      metalness: 0.1,
    });
  }, []);

  // Create clothing material with texture if available
  const clothingMaterial = useMemo(() => {
    if (clothingTexture) {
      return new THREE.MeshStandardMaterial({
        map: clothingTexture,
        roughness: 0.7,
        metalness: 0.0,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x3a3a3a),
      roughness: 0.7,
      metalness: 0.0,
    });
  }, [clothingTexture]);

  // Head material with photo texture
  const headMaterial = useMemo(() => {
    if (photoTexture) {
      return new THREE.MeshStandardMaterial({
        map: photoTexture,
        roughness: 0.5,
        metalness: 0.0,
      });
    }
    return bodyMaterial;
  }, [photoTexture, bodyMaterial]);

  return (
    <group ref={groupRef} scale={[1, bodyScale.height, 1]}>
      {/* Head */}
      <mesh position={[0, 1.55, 0]} material={headMaterial}>
        <sphereGeometry args={[0.12, 32, 32]} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.4, 0]} material={bodyMaterial}>
        <cylinderGeometry args={[0.04, 0.05, 0.1, 16]} />
      </mesh>
      
      {/* Torso - Upper (chest) */}
      <mesh position={[0, 1.2, 0]} scale={[bodyScale.chest, 1, 0.6]} material={clothingMaterial}>
        <boxGeometry args={[0.35, 0.25, 0.2]} />
      </mesh>
      
      {/* Torso - Middle (waist area) */}
      <mesh position={[0, 0.95, 0]} scale={[bodyScale.waist, 1, 0.55]} material={clothingMaterial}>
        <boxGeometry args={[0.32, 0.25, 0.18]} />
      </mesh>
      
      {/* Torso - Lower (hips) */}
      <mesh position={[0, 0.72, 0]} scale={[bodyScale.hips, 1, 0.6]} material={clothingMaterial}>
        <boxGeometry args={[0.34, 0.2, 0.18]} />
      </mesh>
      
      {/* Left Arm */}
      <group position={[-0.22 * bodyScale.chest, 1.15, 0]} rotation={[0, 0, 0.15]}>
        <mesh position={[0, -0.12, 0]} material={clothingMaterial}>
          <capsuleGeometry args={[0.035, 0.18, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.35, 0]} material={bodyMaterial}>
          <capsuleGeometry args={[0.03, 0.18, 8, 16]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.52, 0]} material={bodyMaterial}>
          <sphereGeometry args={[0.03, 16, 16]} />
        </mesh>
      </group>
      
      {/* Right Arm */}
      <group position={[0.22 * bodyScale.chest, 1.15, 0]} rotation={[0, 0, -0.15]}>
        <mesh position={[0, -0.12, 0]} material={clothingMaterial}>
          <capsuleGeometry args={[0.035, 0.18, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.35, 0]} material={bodyMaterial}>
          <capsuleGeometry args={[0.03, 0.18, 8, 16]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.52, 0]} material={bodyMaterial}>
          <sphereGeometry args={[0.03, 16, 16]} />
        </mesh>
      </group>
      
      {/* Left Leg */}
      <group position={[-0.08, 0.55, 0]}>
        <mesh position={[0, -0.15, 0]} material={clothingMaterial}>
          <capsuleGeometry args={[0.055, 0.25, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.45, 0]} material={clothingMaterial}>
          <capsuleGeometry args={[0.045, 0.25, 8, 16]} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.65, 0.03]} material={bodyMaterial}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
        </mesh>
      </group>
      
      {/* Right Leg */}
      <group position={[0.08, 0.55, 0]}>
        <mesh position={[0, -0.15, 0]} material={clothingMaterial}>
          <capsuleGeometry args={[0.055, 0.25, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.45, 0]} material={clothingMaterial}>
          <capsuleGeometry args={[0.045, 0.25, 8, 16]} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.65, 0.03]} material={bodyMaterial}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
        </mesh>
      </group>
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
  const [photoTexture, setPhotoTexture] = useState<THREE.Texture | null>(null);
  const [clothingTexture, setClothingTexture] = useState<THREE.Texture | null>(null);

  // Load photo texture for head
  useEffect(() => {
    if (avatarUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        avatarUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          setPhotoTexture(texture);
        },
        undefined,
        (error) => console.error('Error loading photo texture:', error)
      );
    }
  }, [avatarUrl]);

  // Load clothing texture for try-on
  useEffect(() => {
    if (tryOnUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        tryOnUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          setClothingTexture(texture);
        },
        undefined,
        (error) => console.error('Error loading clothing texture:', error)
      );
    } else {
      setClothingTexture(null);
    }
  }, [tryOnUrl]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />
      <pointLight position={[0, 2, 2]} intensity={0.4} color="#ffeedd" />
      
      {/* Environment for reflections */}
      <Environment preset="studio" />
      
      {/* Ground plane for shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
      </mesh>
      
      {/* Avatar body */}
      <HumanoidBody 
        photoTexture={photoTexture} 
        clothingTexture={clothingTexture}
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
