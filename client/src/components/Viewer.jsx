import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import * as THREE from 'three';
import axios from 'axios';
import { Eye, Ruler, MessageSquare, Loader as LoaderIcon } from 'lucide-react';

function Model({ asset, url, onClick }) {
  const { format } = asset;

  if (format === 'stl') {
    const geom = useLoader(STLLoader, url);
    return (
      <mesh geometry={geom} onClick={onClick}>
        <meshStandardMaterial color="#6366f1" roughness={0.5} />
      </mesh>
    );
  }

  if (format === 'ply') {
    const geom = useLoader(PLYLoader, url);
    geom.computeVertexNormals();
    return (
        <mesh geometry={geom} onClick={onClick}>
            <meshStandardMaterial color="#0ea5e9" roughness={0.5} />
        </mesh>
    );
  }

  if (format === 'step' || format === 'glb') {
      const gltf = useLoader(GLTFLoader, url);
      return <primitive object={gltf.scene} onClick={onClick} />;
  }

  return null;
}

function Annotations({ annotations }) {
    return (
        <group>
            {annotations.map((ann, i) => (
                <Html key={i} position={[ann.position.x, ann.position.y, ann.position.z]}>
                    <div className="annotation-marker" title={ann.text} onClick={(e) => { e.stopPropagation(); alert(ann.text); }}>
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
                <lineBasicMaterial color="#ef4444" linewidth={2} />
            </line>
            <Html position={midPoint}>
                <div className="measurement-label">
                    {distance.toFixed(2)} units
                </div>
            </Html>
        </group>
    );
}

function Scene({ asset, fileUrl, mode, onAddAnnotation, annotations }) {
    const [measurePoints, setMeasurePoints] = useState([]);

    const handleClick = (e) => {
        e.stopPropagation();
        if (mode === 'measure') {
            const point = e.point;
            setMeasurePoints(prev => {
                if (prev.length >= 2) return [point];
                return [...prev, point];
            });
        } else if (mode === 'annotate') {
            // Delay slightly to prevent OrbitControls from catching the click immediately if dragged
            setTimeout(() => {
                const text = prompt("Enter annotation text:");
                if (text) {
                    onAddAnnotation({ text, position: e.point });
                }
            }, 100);
        }
    };

    return (
        <>
            <Stage environment="city" intensity={0.6}>
                <Model asset={asset} url={fileUrl} onClick={handleClick} />
            </Stage>
            <Annotations annotations={annotations} />
            {measurePoints.length === 2 && (
                <MeasureLine start={measurePoints[0]} end={measurePoints[1]} />
            )}
             {measurePoints.length === 1 && (
                 <mesh position={measurePoints[0]}>
                     <sphereGeometry args={[0.05]} />
                     <meshBasicMaterial color="#ef4444" />
                 </mesh>
             )}
            <OrbitControls makeDefault />
        </>
    );
}

function Loader() {
  return <Html center><div className="canvas-loader"><LoaderIcon className="spin" /> Loading model...</div></Html>
}

export default function Viewer({ asset }) {
    const [mode, setMode] = useState('view'); // view, measure, annotate
    const [annotations, setAnnotations] = useState([]);

    const fileId = asset.renderableFileId || asset.originalFileId;
    const fileUrl = `/api/files/${fileId}`;

    useEffect(() => {
        if (!asset._id) return;
        setAnnotations([]);
        setMode('view'); // Reset mode on asset change
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
                cameraState: {}
            });
            setAnnotations([...annotations, res.data]);
            setMode('view');
        } catch (err) {
            console.error(err);
        }
    };

    if (!fileId) {
        return <div className="viewer-placeholder"><LoaderIcon className="spin" size={40} /> <p>Processing file...</p></div>;
    }

    return (
        <div className="viewer-container">
            <div className="toolbar">
                <button
                    className={`tool-btn ${mode === 'view' ? 'active' : ''}`}
                    onClick={() => setMode('view')}
                    title="View Mode"
                >
                    <Eye size={20} />
                </button>
                <button
                    className={`tool-btn ${mode === 'measure' ? 'active' : ''}`}
                    onClick={() => setMode('measure')}
                    title="Measure Distance"
                >
                    <Ruler size={20} />
                </button>
                <button
                    className={`tool-btn ${mode === 'annotate' ? 'active' : ''}`}
                    onClick={() => setMode('annotate')}
                    title="Add Annotation"
                >
                    <MessageSquare size={20} />
                </button>
            </div>

            {mode !== 'view' && (
                <div className="mode-instruction">
                    {mode === 'measure' && "Click two points on the model to measure distance"}
                    {mode === 'annotate' && "Click anywhere on the model to add a note"}
                </div>
            )}

            <Canvas camera={{ position: [5, 5, 5] }} shadows>
                <Suspense fallback={<Loader />}>
                    <Scene
                        asset={asset}
                        fileUrl={fileUrl}
                        mode={mode}
                        onAddAnnotation={handleAddAnnotation}
                        annotations={annotations}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
