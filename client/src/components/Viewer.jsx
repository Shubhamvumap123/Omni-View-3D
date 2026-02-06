import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Html, Grid } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import * as THREE from 'three';
import axios from 'axios';

// --- Sub-components ---

function Model({ asset, url, onClick, wireframe }) {
  const { format } = asset;

  // STL
  if (format === 'stl') {
    const geom = useLoader(STLLoader, url);
    return (
      <mesh geometry={geom} onClick={onClick}>
        <meshStandardMaterial color="#ff9800" wireframe={wireframe} />
      </mesh>
    );
  }

  // PLY
  if (format === 'ply') {
    const geom = useLoader(PLYLoader, url);
    useMemo(() => geom.computeVertexNormals(), [geom]);
    return (
        <mesh geometry={geom} onClick={onClick}>
            <meshStandardMaterial color="#03a9f4" wireframe={wireframe} />
        </mesh>
    );
  }

  // GLTF / STEP
  if (format === 'step' || format === 'glb') {
      const gltf = useLoader(GLTFLoader, url);
      const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]);

      useEffect(() => {
          scene.traverse((child) => {
              if (child.isMesh) {
                  child.material.wireframe = wireframe;
                  // Ensure materials are visible and look good
                  if (!child.material.map) {
                      child.material.color.setHex(0x4CAF50); // Default green if no texture
                  }
              }
          });
      }, [wireframe, scene]);

      return <primitive object={scene} onClick={onClick} />;
  }

  return null;
}

function Annotations({ annotations }) {
    return (
        <group>
            {annotations.map((ann, i) => (
                <Html key={i} position={[ann.position.x, ann.position.y, ann.position.z]}>
                    <div className="annotation-marker"
                        style={{
                            background: 'var(--accent-color)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            transform: 'translate3d(-50%, -100%, 0)',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={(e) => { e.stopPropagation(); alert(ann.text); }}
                    >
                        {i + 1}
                    </div>
                </Html>
            ))}
        </group>
    );
}

function MeasureLine({ start, end }) {
    if (!start || !end) return null;
    const points = [start, end];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const distance = start.distanceTo(end);
    const midPoint = start.clone().add(end).multiplyScalar(0.5);

    return (
        <group>
            <line geometry={lineGeometry}>
                <lineBasicMaterial color="#f44336" linewidth={2} />
            </line>
            <Html position={midPoint}>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                    {distance.toFixed(2)} units
                </div>
            </Html>
        </group>
    );
}

// Scene Controller to access Three.js context
function Scene({
    asset, fileUrl, mode,
    wireframe, autoRotate, bgColor,
    onAddAnnotation, annotations,
    controlsRef, setScreenshotFn
}) {
    const { camera, gl } = useThree();
    const [measurePoints, setMeasurePoints] = useState([]);

    // Expose screenshot function to parent
    useEffect(() => {
        setScreenshotFn(() => () => {
            const link = document.createElement('a');
            link.setAttribute('download', `screenshot-${asset.title}.png`);
            link.setAttribute('href', gl.domElement.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
            link.click();
        });
    }, [gl, asset.title, setScreenshotFn]);

    const handleClick = (e) => {
        e.stopPropagation();
        if (mode === 'measure') {
            const point = e.point;
            setMeasurePoints(prev => {
                if (prev.length >= 2) return [point];
                return [...prev, point];
            });
        } else if (mode === 'annotate') {
            const text = prompt("Enter annotation text:");
            if (text) {
                const target = controlsRef.current ? controlsRef.current.target.toArray() : [0,0,0];
                const position = camera.position.toArray();

                onAddAnnotation({
                    text,
                    position: e.point,
                    cameraState: { position, target }
                });
            }
        }
    };

    return (
        <>
            <color attach="background" args={[bgColor]} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            <Stage environment="city" intensity={0.5} adjustCamera={false}>
                <Model asset={asset} url={fileUrl} onClick={handleClick} wireframe={wireframe} />
            </Stage>

            <Annotations annotations={annotations} />

            {measurePoints.length === 2 && (
                <MeasureLine start={measurePoints[0]} end={measurePoints[1]} />
            )}
             {measurePoints.length === 1 && (
                 <mesh position={measurePoints[0]}>
                     <sphereGeometry args={[0.05]} />
                     <meshBasicMaterial color="red" />
                 </mesh>
             )}

             <Grid infiniteGrid fadeDistance={50} sectionColor={new THREE.Color(0.5,0.5,0.5)} cellColor={new THREE.Color(0.2,0.2,0.2)}/>

            <OrbitControls ref={controlsRef} makeDefault autoRotate={autoRotate} />
        </>
    );
}

export default function Viewer({ asset }) {
    const [mode, setMode] = useState('view'); // view, measure, annotate
    const [annotations, setAnnotations] = useState([]);

    // View Settings
    const [wireframe, setWireframe] = useState(false);
    const [autoRotate, setAutoRotate] = useState(false);
    const [bgColor, setBgColor] = useState('#1e1e1e');

    const controlsRef = useRef();
    const [screenshotFn, setScreenshotFn] = useState(null);

    const fileId = asset.renderableFileId || asset.originalFileId;
    const fileUrl = `/api/files/${fileId}`;

    useEffect(() => {
        // Fetch annotations
        axios.get(`/api/annotations/${asset._id}`)
            .then(res => setAnnotations(res.data))
            .catch(console.error);
    }, [asset._id]);

    const handleAddAnnotation = async (data) => {
        try {
            const res = await axios.post('/api/annotations', {
                assetId: asset._id,
                text: data.text,
                position: data.position,
                cameraState: data.cameraState
            });
            setAnnotations([...annotations, res.data]);
            setMode('view');
        } catch (err) {
            console.error(err);
        }
    };

    const jumpToAnnotation = (ann) => {
        if (controlsRef.current && ann.cameraState) {
            const { position, target } = ann.cameraState;
            if (position && target) {
                // Animate camera
                const cam = controlsRef.current.object;
                cam.position.set(...position);
                controlsRef.current.target.set(...target);
                controlsRef.current.update();
            }
        }
    };

    if (!fileId) {
        return <div style={{ padding: 20 }}>Processing file... please wait.</div>;
    }

    return (
        <div style={{ height: '100%', position: 'relative' }}>
            {/* Toolbar */}
            <div className="glass-panel tools-panel">
                <div className="tool-section">
                    <div className="tool-section-title">Mode</div>
                    <div className="tools-row">
                        <button onClick={() => setMode('view')} className={mode === 'view' ? 'active-tool' : ''}>View</button>
                        <button onClick={() => setMode('measure')} className={mode === 'measure' ? 'active-tool' : ''}>Measure</button>
                        <button onClick={() => setMode('annotate')} className={mode === 'annotate' ? 'active-tool' : ''}>Note</button>
                    </div>
                </div>

                <div className="tool-section">
                    <div className="tool-section-title">Display</div>
                    <div className="tools-row">
                        <button onClick={() => setWireframe(!wireframe)} className={wireframe ? 'active-tool' : ''}>Wire</button>
                        <button onClick={() => setAutoRotate(!autoRotate)} className={autoRotate ? 'active-tool' : ''}>Spin</button>
                    </div>
                </div>

                <div className="tool-section">
                    <div className="tool-section-title">Actions</div>
                     <div className="tools-row">
                        <button onClick={() => screenshotFn && screenshotFn()}>Photo</button>
                    </div>
                </div>

                <div style={{ marginTop: 5, fontSize: '0.7em', color: '#aaa', fontStyle: 'italic' }}>
                    {mode === 'measure' && "Click 2 points"}
                    {mode === 'annotate' && "Click model to note"}
                </div>
            </div>

            {/* Annotation List */}
            {annotations.length > 0 && (
                <div className="glass-panel annotation-list-panel">
                    <div className="tool-section-title" style={{padding: '0 8px'}}>Annotations</div>
                    {annotations.map((ann, i) => (
                        <div key={i} className="annotation-item" onClick={() => jumpToAnnotation(ann)}>
                            <strong>{i + 1}.</strong> {ann.text}
                        </div>
                    ))}
                </div>
            )}

            <Canvas
                camera={{ position: [5, 5, 5] }}
                gl={{ preserveDrawingBuffer: true }}
                shadows
            >
                <Suspense fallback={<Html center>Loading 3D...</Html>}>
                    <Scene
                        asset={asset}
                        fileUrl={fileUrl}
                        mode={mode}
                        wireframe={wireframe}
                        autoRotate={autoRotate}
                        bgColor={bgColor}
                        onAddAnnotation={handleAddAnnotation}
                        annotations={annotations}
                        controlsRef={controlsRef}
                        setScreenshotFn={setScreenshotFn}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
