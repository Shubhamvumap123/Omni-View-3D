import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import * as THREE from 'three';
import axios from 'axios';

function Model({ asset, url, onClick }) {
  const { format } = asset;
  let geometry;

  // For GLTF, useLoader returns the GLTF object, we need the scene or nodes
  // For STL/PLY, it returns BufferGeometry

  if (format === 'stl') {
    const geom = useLoader(STLLoader, url);
    return (
      <mesh geometry={geom} onClick={onClick}>
        <meshStandardMaterial color="orange" />
      </mesh>
    );
  }

  if (format === 'ply') {
    const geom = useLoader(PLYLoader, url);
    // PLY might invoke computeVertexNormals if missing
    geom.computeVertexNormals();
    return (
        <mesh geometry={geom} onClick={onClick}>
            <meshStandardMaterial color="lightblue" />
        </mesh>
    );
  }

  if (format === 'step' || format === 'glb') {
      // Step files are converted to GLB
      const gltf = useLoader(GLTFLoader, url);
      return <primitive object={gltf.scene} onClick={onClick} />;
  }

  return null;
}

function Annotations({ annotations, onSelect }) {
    return (
        <group>
            {annotations.map((ann, i) => (
                <Html key={i} position={[ann.position.x, ann.position.y, ann.position.z]}>
                    <div
                        style={{ background: 'white', padding: '5px', borderRadius: '50%', cursor: 'pointer', border: '1px solid black', width: '20px', height: '20px', textAlign: 'center', lineHeight: '20px' }}
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
                <lineBasicMaterial color="red" linewidth={2} />
            </line>
            <Html position={midPoint}>
                <div style={{ background: 'black', color: 'white', padding: '2px 5px', borderRadius: '3px' }}>
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
            const text = prompt("Enter annotation text:");
            if (text) {
                onAddAnnotation({ text, position: e.point });
            }
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
                     <sphereGeometry args={[0.1]} />
                     <meshBasicMaterial color="red" />
                 </mesh>
             )}
            <OrbitControls makeDefault />
        </>
    );
}

export default function Viewer({ asset }) {
    const [mode, setMode] = useState('view'); // view, measure, annotate
    const [annotations, setAnnotations] = useState([]);

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
                cameraState: {} // Placeholder
            });
            setAnnotations([...annotations, res.data]);
            setMode('view');
        } catch (err) {
            console.error(err);
        }
    };

    if (!fileId) {
        return <div style={{ padding: 20 }}>Processing file... please wait.</div>;
    }

    return (
        <div style={{ height: '100%', position: 'relative' }}>
            <div className="tools-panel">
                <strong>Tools: </strong>
                <button onClick={() => setMode('view')} disabled={mode === 'view'}>View</button>
                <button onClick={() => setMode('measure')} disabled={mode === 'measure'}>Measure</button>
                <button onClick={() => setMode('annotate')} disabled={mode === 'annotate'}>Annotate</button>
                <div style={{ marginTop: 5, fontSize: '0.8em', color: '#666' }}>
                    {mode === 'measure' && "Click 2 points on model"}
                    {mode === 'annotate' && "Click on model to add note"}
                </div>
            </div>

            <Canvas camera={{ position: [5, 5, 5] }}>
                <Suspense fallback={<Html>Loading...</Html>}>
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
