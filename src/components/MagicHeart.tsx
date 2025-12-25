import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Text } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";

// Função helper para linear interpolation
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Função helper para ease out cubic
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function BackgroundStars({ count = 500 }) {
  const starsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos: number[] = [];
    const vel: THREE.Vector3[] = [];

    // Usar um seed fixo para evitar warnings do React Compiler
    let seed = 12345;
    function random() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    for (let i = 0; i < count; i++) {
      // Posições aleatórias em uma esfera maior
      const radius = 15 + random() * 20;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      pos.push(x, y, z);

      // Velocidades aleatórias direcionadas para o centro
      const speed = 0.2 + random() * 0.3;
      vel.push(
        new THREE.Vector3(
          -x * speed * 0.01,
          -y * speed * 0.01,
          -z * speed * 0.01
        )
      );
    }

    return {
      positions: new Float32Array(pos),
      velocities: vel,
    };
  }, [count]);

  const velocitiesRef = useRef(velocities);

  // Atualizar ref quando velocities mudar
  useEffect(() => {
    velocitiesRef.current = velocities;
  }, [velocities]);

  useFrame((_, delta) => {
    if (
      starsRef.current &&
      velocitiesRef.current &&
      velocitiesRef.current.length > 0
    ) {
      const positionsArray = starsRef.current.geometry.attributes.position
        .array as Float32Array;
      const velocitiesArray = velocitiesRef.current;

      // Usar um seed baseado no índice para randomização diferente
      let resetSeed = 54321;
      function resetRandom() {
        resetSeed = (resetSeed * 9301 + 49297) % 233280;
        return resetSeed / 233280;
      }

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        positionsArray[idx] += velocitiesArray[i].x * delta;
        positionsArray[idx + 1] += velocitiesArray[i].y * delta;
        positionsArray[idx + 2] += velocitiesArray[i].z * delta;

        // Resetar posição se ficar muito perto do centro ou muito longe
        const dist = Math.sqrt(
          positionsArray[idx] ** 2 +
            positionsArray[idx + 1] ** 2 +
            positionsArray[idx + 2] ** 2
        );

        if (dist < 5 || dist > 40) {
          const radius = 15 + resetRandom() * 20;
          const theta = resetRandom() * Math.PI * 2;
          const phi = Math.acos(resetRandom() * 2 - 1);

          positionsArray[idx] = radius * Math.sin(phi) * Math.cos(theta);
          positionsArray[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positionsArray[idx + 2] = radius * Math.cos(phi);
        }
      }

      starsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={starsRef} positions={positions}>
      <PointMaterial
        transparent
        color="#ffd700"
        size={0.02}
        sizeAttenuation
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

function HeartParticles({
  rotationRef,
}: {
  rotationRef: React.MutableRefObject<{ z: number; y: number }>;
}) {
  const ref = useRef<THREE.Points>(null);
  const progressRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  const { initialPositions, targetPositions, startingPositions } =
    useMemo(() => {
      const initial: number[] = [];
      const target: number[] = [];
      const scale = 0.08;

      // Usar um seed fixo para evitar warnings do React Compiler
      let seed = 67890;
      function random() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }

      for (let t = 0; t < Math.PI * 2; t += 0.02) {
        // Posição final do coração
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);

        const finalX = x * scale;
        const finalY = y * scale;
        const finalZ = (random() - 0.5) * 0.2;

        target.push(finalX, finalY, finalZ);

        // Posição inicial aleatória em esfera (mais espalhada)
        const radius = 8 + random() * 10;
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(random() * 2 - 1);

        const initialX = radius * Math.sin(phi) * Math.cos(theta);
        const initialY = radius * Math.sin(phi) * Math.sin(theta);
        const initialZ = radius * Math.cos(phi);

        initial.push(initialX, initialY, initialZ);
      }

      return {
        initialPositions: new Float32Array(initial),
        targetPositions: new Float32Array(target),
        startingPositions: new Float32Array(initial), // Cópia para inicializar
      };
    }, []);

  useFrame((_, delta) => {
    if (ref.current && ref.current.geometry) {
      // Controlar progresso da animação
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const delay = 2; // Delay de 2 segundos antes de começar
      const duration = 3.5; // 3.5 segundos para formar o coração

      // Aplicar delay antes de começar a animação
      if (elapsed >= delay) {
        const animationTime = elapsed - delay;
        if (animationTime < duration) {
          progressRef.current = easeOutCubic(
            Math.min(animationTime / duration, 1)
          );
        } else {
          progressRef.current = 1;
        }
      } else {
        progressRef.current = 0; // Ainda no delay, manter nas posições iniciais
      }

      // Interpolar posições apenas após o delay
      const positions = ref.current.geometry.attributes.position
        .array as Float32Array;
      for (
        let i = 0;
        i < positions.length && i < initialPositions.length;
        i += 3
      ) {
        positions[i] = lerp(
          initialPositions[i],
          targetPositions[i],
          progressRef.current
        );
        positions[i + 1] = lerp(
          initialPositions[i + 1],
          targetPositions[i + 1],
          progressRef.current
        );
        positions[i + 2] = lerp(
          initialPositions[i + 2],
          targetPositions[i + 2],
          progressRef.current
        );
      }

      ref.current.geometry.attributes.position.needsUpdate = true;

      // Rotação contínua desde o início
      if (progressRef.current > 0.8) {
        // Rotação mais rápida após formação completa
        ref.current.rotation.z += delta * 0.3;
        ref.current.rotation.y += delta * 0.15;
      } else {
        // Rotação suave durante a formação ou antes dela
        ref.current.rotation.z += delta * 0.15;
        ref.current.rotation.y += delta * 0.08;
      }
      // Sempre atualizar ref compartilhado para o texto seguir
      rotationRef.current.z = ref.current.rotation.z;
      rotationRef.current.y = ref.current.rotation.y;
    }
  });

  return (
    <Points ref={ref} positions={startingPositions}>
      <PointMaterial
        transparent
        color="#ffaa00"
        size={0.12}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  );
}

function AnimatedText({
  rotationRef,
}: {
  rotationRef: React.MutableRefObject<{ z: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const textRef1 = useRef<THREE.Mesh>(null);
  const textRef2 = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  const updateText = (
    textRef: React.RefObject<THREE.Mesh | null>,
    elapsed: number
  ) => {
    if (textRef.current) {
      // Animações de scale e opacidade
      const scale = lerp(0.5, 1, progressRef.current);
      textRef.current.scale.set(scale, scale, scale);

      // Animar opacidade do material
      if (textRef.current.material) {
        if (Array.isArray(textRef.current.material)) {
          textRef.current.material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.opacity = progressRef.current;
              mat.transparent = true;
            }
          });
        } else if (
          textRef.current.material instanceof THREE.MeshStandardMaterial
        ) {
          textRef.current.material.opacity = progressRef.current;
          textRef.current.material.transparent = true;
        }
      }

      // Efeito de pulso suave após aparecer
      if (progressRef.current >= 1) {
        const pulse = Math.sin(elapsed * 2) * 0.05 + 1;
        textRef.current.scale.set(pulse, pulse, pulse);
      }
    }
  };

  useFrame(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }

    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const duration = 1.5; // 1.5 segundos para aparecer completamente

    // Texto aparece imediatamente, sem delay
    const animProgress = Math.min(elapsed / duration, 1);
    progressRef.current = easeOutCubic(animProgress);

    // Aplicar rotação do coração ao grupo
    if (groupRef.current) {
      groupRef.current.rotation.z = rotationRef.current.z;
      groupRef.current.rotation.y = rotationRef.current.y;
    }

    // Atualizar ambos os textos
    updateText(textRef1, elapsed);
    updateText(textRef2, elapsed);
  });

  return (
    <group ref={groupRef}>
      <Text
        ref={textRef1}
        position={[0, 0.3, 0]}
        fontSize={0.5}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ff6b00"
      >
        I Love You
      </Text>
      <Text
        ref={textRef2}
        position={[0, -0.3, 0]}
        fontSize={0.5}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ff6b00"
      >
        Anna
      </Text>
    </group>
  );
}

export default function MagicHeart() {
  const rotationRef = useRef({ z: 0, y: 0 });

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={2} color="#ffaa00" />
      <pointLight position={[-5, -5, -5]} intensity={1} color="#ff6b00" />

      <BackgroundStars count={500} />
      <HeartParticles rotationRef={rotationRef} />
      <AnimatedText rotationRef={rotationRef} />
    </Canvas>
  );
}
