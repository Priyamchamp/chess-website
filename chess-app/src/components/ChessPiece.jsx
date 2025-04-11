import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

function ChessPiece() {
  const group = useRef();
  const { nodes, materials } = useGLTF('/models/chess_king.glb');

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t / 2) / 4;
    group.current.position.y = Math.sin(t / 1.5) / 4 + 1;
  });

  return (
    <group ref={group} dispose={null} scale={2}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.King.geometry}
        material={materials.Gold}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#fff"
          metalness={0.8}
          roughness={0.2}
          envMapIntensity={1}
        />
      </mesh>
    </group>
  );
}

export default ChessPiece;