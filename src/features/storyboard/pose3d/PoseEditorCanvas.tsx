import React, { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';

interface PoseEditorCanvasProps {
  shotId: string;
  modelPath?: string;
}

export interface Character {
  id: string;
  group: THREE.Group;
  transformControls: TransformControls;
  modelPath: string;
  name: string;
  skeleton?: THREE.Skeleton;
  boneMap?: Map<string, THREE.Bone>;
  rootBone?: THREE.Bone; // 根骨骼，用于控制角色移动
}

export interface PoseEditorCanvasRef {
  renderToImage: () => Promise<string>;
  getCharacters: () => Character[];
  addCharacter: (modelPath: string) => string;
  removeCharacter: (id: string) => void;
  applyPose: (characterId: string, poseData: any) => void;
  selectCharacter: (id: string | null) => void;
  getSelectedCharacterId: () => string | null;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  getTransformMode: () => 'translate' | 'rotate' | 'scale' | null;
}

// 兼容新版 three 中 TransformControls 不再直接继承 Object3D 的情况：
// 在某些版本里，TransformControls 内部有一个 _root(Object3D)，需要把这个 root 加到场景里。
function addTransformControlsToScene(scene: THREE.Scene, controls: TransformControls) {
  const anyControls = controls as any;
  const obj = anyControls._root || controls;
  if (obj instanceof THREE.Object3D && !scene.children.includes(obj)) {
    scene.add(obj);
  }
}

export const PoseEditorCanvas = forwardRef<PoseEditorCanvasRef, PoseEditorCanvasProps>(
  ({ shotId }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const charactersRef = useRef<Map<string, Character>>(new Map());
    const selectedCharacterIdRef = useRef<string | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const transformControlsRef = useRef<TransformControls | null>(null);

    // UI 设置：是否显示安全框
    const showSafeFrame = useUIStore((state) => state.showSafeFrame);


    const getShot = useProjectStore((state) => state.getShot);
    const project = useProjectStore((state) => state.project);
    const shot = getShot(shotId);

    // 避免相机参数更新（framing/cameraAngle）导致整个 three 场景重建而清空角色/姿态
    const shotRef = useRef(shot);
    useEffect(() => {
      shotRef.current = shot;
    }, [shot]);

    function applyCameraForShot(camera: THREE.PerspectiveCamera, controls: OrbitControls, s: any) {
      if (!s) return;
      const framingDistances: Record<string, number> = {
        CU: 2,
        MS: 4,
        WS: 8,
        ECU: 1,
        ELS: 12,
      };
      const distance = framingDistances[s.framing] || 4;
      camera.position.set(0, 1.6, distance);
      camera.lookAt(0, 1.6, 0);

      if (s.cameraAngle === 'low') {
        camera.position.y = 1.2;
      } else if (s.cameraAngle === 'high') {
        camera.position.y = 2.0;
      }

      controls.target.set(0, 1.6, 0);
      controls.update();
      camera.updateProjectionMatrix();
    }

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      renderToImage: async () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
          return '';
        }

        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;

        if (controlsRef.current) {
          controlsRef.current.update();
        }

        // 先按当前视角渲染一帧
        renderer.render(scene, camera);

        const canvas = renderer.domElement;
        const { width, height } = canvas;

        // 解析项目的画幅比例字符串（例如 "16:9"、"2.39:1"）
        const ratioString = project?.aspectRatio || '16:9';
        const [wStr, hStr] = ratioString.split(':');
        const rw = parseFloat(wStr || '16');
        const rh = parseFloat(hStr || '9');
        const targetAspect = rh === 0 ? 16 / 9 : rw / rh;

        const canvasAspect = width / height;

        // 计算需要从原始画布中裁剪的区域（保证与安全框一致）
        let sx = 0;
        let sy = 0;
        let sWidth = width;
        let sHeight = height;

        if (canvasAspect > targetAspect) {
          // 画布更宽，以高度为准，左右裁掉
          sHeight = height;
          sWidth = height * targetAspect;
          sx = (width - sWidth) / 2;
          sy = 0;
        } else {
          // 画布更高，以宽度为准，上下裁掉
          sWidth = width;
          sHeight = width / targetAspect;
          sx = 0;
          sy = (height - sHeight) / 2;
        }

        // 使用离屏 canvas 生成裁剪后的图片
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.round(sWidth);
        offscreen.height = Math.round(sHeight);
        const ctx = offscreen.getContext('2d');
        if (!ctx) {
          return canvas.toDataURL('image/png');
        }

        ctx.drawImage(
          canvas,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          offscreen.width,
          offscreen.height
        );

        return offscreen.toDataURL('image/png');
      },
      getCharacters: () => Array.from(charactersRef.current.values()),
      addCharacter: (modelPath: string) => {
        return loadCharacter(modelPath);
      },
      removeCharacter: (id: string) => {
        const character = charactersRef.current.get(id);
        if (character && sceneRef.current) {
          // 如果这是当前选中的角色，先取消选中
          if (selectedCharacterIdRef.current === id) {
            if (transformControlsRef.current) {
              transformControlsRef.current.detach();
            }
            selectedCharacterIdRef.current = null;
          }

          // 移除 TransformControls
          const anyControls = character.transformControls as any;
          const objToRemove = anyControls._root || character.transformControls;
          if (objToRemove instanceof THREE.Object3D) {
            sceneRef.current.remove(objToRemove);
          }
          character.transformControls.dispose();
          // 移除角色模型
          sceneRef.current.remove(character.group);
          character.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
          charactersRef.current.delete(id);
        }
      },
      applyPose: (characterId: string, poseData: any) => {
        const character = charactersRef.current.get(characterId);
        if (!character || !poseData) {
          console.error('角色或姿态数据不存在', { characterId, poseData });
          return;
        }

        const group = character.group;
        console.log('应用姿态到角色:', characterId, poseData);

        // 如果没有骨骼映射，先构建它
        if (!character.boneMap || !character.skeleton) {
          let skeleton: THREE.Skeleton | null = null;
          const boneMap = new Map<string, THREE.Bone>();

          // 从 SkinnedMesh 获取骨骼系统
          group.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh && child.skeleton) {
              skeleton = child.skeleton;
              // 遍历所有骨骼
              child.skeleton.bones.forEach((bone) => {
                boneMap.set(bone.name, bone);
              });
            }
          });

          if (skeleton && boneMap.size > 0) {
            character.skeleton = skeleton;
            character.boneMap = boneMap;
            console.log(`✓ 构建骨骼映射，找到 ${boneMap.size} 个骨骼`);
            console.log('✓ 骨骼名称:', Array.from(boneMap.keys()).join(', '));
          } else {
            console.error('✗ 错误: 未找到骨骼系统，无法应用姿势');
            return;
          }
        }

        // 应用姿态
        if (poseData.state && poseData.state.skeleton && character.boneMap) {
          const skeletonData = poseData.state.skeleton;
          let bonesFound = 0;

          // 应用姿态数据到匹配的骨骼
          const poseBoneNames = Object.keys(skeletonData);
          console.log(`📋 姿势包含 ${poseBoneNames.length} 个骨骼:`, poseBoneNames.join(', '));
          
          Object.keys(skeletonData).forEach((boneName) => {
            const bone = character.boneMap!.get(boneName);
            if (bone) {
              const boneData = skeletonData[boneName];
              bonesFound++;

              if (boneData.rotation) {
                bone.rotation.set(
                  boneData.rotation.x || 0,
                  boneData.rotation.y || 0,
                  boneData.rotation.z || 0
                );
              }
              if (boneData.position) {
                bone.position.set(
                  boneData.position.x || 0,
                  boneData.position.y || 0,
                  boneData.position.z || 0
                );
              }
            } else {
              console.warn(`⚠ 未找到骨骼: ${boneName}`);
            }
          });

          console.log(`✓ 成功应用了 ${bonesFound}/${poseBoneNames.length} 个骨骼的姿态`);

          // 更新骨骼系统
          if (character.skeleton) {
            // 更新所有骨骼的矩阵
            character.skeleton.bones.forEach((bone) => {
              bone.updateMatrixWorld(true);
            });
            // 更新骨骼系统
            character.skeleton.update();
          }

          // 更新所有 SkinnedMesh
          group.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh && child.skeleton) {
              // 更新骨骼矩阵
              child.skeleton.bones.forEach((bone) => {
                bone.updateMatrixWorld(true);
              });
              // 更新骨骼系统
              child.skeleton.update();
            }
          });
          
          // 强制更新场景
          group.updateMatrixWorld(true);
        } else {
          console.warn('姿态数据中没有 skeleton 信息:', poseData);
        }
      },
      selectCharacter: (id: string | null) => {
        // 先分离所有控制轴
        charactersRef.current.forEach((char) => {
          if (char.transformControls) {
            char.transformControls.detach();
          }
        });

        if (transformControlsRef.current) {
          transformControlsRef.current.detach();
          transformControlsRef.current = null;
        }

        // 显示选中角色的控制轴
        if (id && sceneRef.current) {
          const character = charactersRef.current.get(id);
          if (character) {
            // 确保 TransformControls 在场景中（兼容 _root 结构）
            addTransformControlsToScene(sceneRef.current, character.transformControls);

            // 优先使用根骨骼控制角色移动，如果没有根骨骼则使用 group
            const targetObject = character.rootBone || character.group;
            
            // 先取消之前的附加（如果有）
            if (character.transformControls.object) {
              character.transformControls.detach();
            }
            
            // 确保目标对象矩阵已更新
            if (character.rootBone) {
              character.rootBone.updateMatrixWorld(true);
            } else {
              character.group.updateMatrixWorld(true);
            }
            
            // 再次确保 TransformControls 在场景中
            addTransformControlsToScene(sceneRef.current, character.transformControls);
            
            // 附加到根骨骼或根组
            // 重要：必须先 detach，再 attach，确保正确附加
            character.transformControls.detach();
            character.transformControls.attach(targetObject);
            
            // 确保模式正确设置为移动
            character.transformControls.setMode('translate');
            character.transformControls.setSpace('world');
            
            // 确保 TransformControls 可以接收事件
            character.transformControls.enabled = true;
            (character.transformControls as any).visible = true; // 显示控制轴
            
            transformControlsRef.current = character.transformControls;
            selectedCharacterIdRef.current = id;

            // 强制更新一次，确保控制轴显示在正确位置
            if (character.rootBone) {
              character.rootBone.updateMatrixWorld(true);
            } else {
              character.group.updateMatrixWorld(true);
            }
            // 某些 three.js/TransformControls 版本（或打包差异）下，TransformControls 实例可能没有 updateMatrixWorld 方法
            // 直接调用会抛异常，导致控制轴不显示/交互卡死。这里做安全调用。
            const tcAny = character.transformControls as any;
            if (typeof tcAny.updateMatrixWorld === 'function') {
              tcAny.updateMatrixWorld(true);
            }
            
            // 确保 TransformControls 正确同步位置
            if (character.transformControls.object) {
              character.transformControls.object.updateMatrixWorld(true);
            }

            // 立即渲染一帧，避免首次选中时控制轴延迟/不刷新
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            
            // 验证附加状态
            const isAttached = character.transformControls.object === targetObject;
            console.log('✓ 选中角色:', id);
            console.log('  - 使用根骨骼控制:', !!character.rootBone);
            console.log('  - 根骨骼名称:', character.rootBone?.name || '无');
            if (character.rootBone) {
              console.log('  - 根骨骼位置:', character.rootBone.position.toArray());
              console.log('  - 根骨骼世界位置:', character.rootBone.getWorldPosition(new THREE.Vector3()).toArray());
            } else {
              console.log('  - 角色位置:', character.group.position.toArray());
            }
            console.log('  - TransformControls 模式:', character.transformControls.getMode());
            console.log('  - TransformControls 已附加:', isAttached);
            console.log('  - TransformControls 对象:', character.transformControls.object);
            console.log('  - 目标对象位置:', character.transformControls.object?.position?.toArray());
            console.log('  - TransformControls 可见:', (character.transformControls as any).visible);
            console.log('  - TransformControls 已启用:', character.transformControls.enabled);
            
            if (!isAttached) {
              console.error('❌ 错误：TransformControls 未正确附加到目标对象！');
            }
          }
        } else {
          // 隐藏所有控制轴
          charactersRef.current.forEach((char) => {
            (char.transformControls as any).visible = false;
          });
          selectedCharacterIdRef.current = null;
        }
      },
      getSelectedCharacterId: () => selectedCharacterIdRef.current,
      setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => {
        const activeControls = transformControlsRef.current;
        if (activeControls && (activeControls as any).visible) {
          activeControls.setMode(mode);
          console.log(`切换到${mode === 'translate' ? '平移' : mode === 'rotate' ? '旋转' : '缩放'}模式`);
        }
      },
      getTransformMode: () => {
        const activeControls = transformControlsRef.current;
        if (activeControls && (activeControls as any).visible) {
          return activeControls.getMode() as 'translate' | 'rotate' | 'scale';
        }
        return null;
      },
    }));

    // 计算安全框样式（根据项目画幅比例）
    const safeFrameStyle = useMemo(() => {
      const ratioString = project?.aspectRatio || '16:9';
      const [wStr, hStr] = ratioString.split(':');
      const w = parseFloat(wStr || '16');
      const h = parseFloat(hStr || '9');
      const aspect = h === 0 ? 16 / 9 : w / h;

      const style: React.CSSProperties = {
        maxWidth: '100%',
        maxHeight: '100%',
        border: '3px solid rgba(200,200,200,0.9)', // 浅灰色安全框
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.0)',
        boxSizing: 'border-box',
      };

      // 对于竖屏（aspect < 1，如9:16）：高度填满，宽度按比例
      // 对于横屏（aspect >= 1，如16:9）：宽度填满，高度按比例
      if (aspect < 1) {
        // 竖屏：高度填满容器
        style.height = '100%';
        style.width = 'auto';
      } else {
        // 横屏：宽度填满容器
        style.width = '100%';
        style.height = 'auto';
      }

      // 使用浏览器的 aspect-ratio 支持来控制比例
      // aspect-ratio 格式应该是 "width / height"
      (style as any).aspectRatio = `${w} / ${h}`;

      return style;
    }, [project?.aspectRatio]);

    // 加载角色模型
    const loadCharacter = (path: string): string => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current) {
        return '';
      }

      const id = crypto.randomUUID();
      const loader = new GLTFLoader();

      loader.load(
        path,
        (gltf) => {
          if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

          // 使用 clone 确保每个角色独立
          const character = gltf.scene.clone();
          
          // 设置初始位置（随机偏移避免重叠）
          const offset = charactersRef.current.size * 1.5;
          character.position.set(
            (Math.random() - 0.5) * offset,
            0,
            (Math.random() - 0.5) * offset
          );
          character.scale.set(1, 1, 1);
          
          // 关键：确保所有对象的 matrixAutoUpdate 都是 true
          character.matrixAutoUpdate = true;
          character.matrixWorldAutoUpdate = true;
          
          // 遍历所有子对象，确保它们的 matrixAutoUpdate 都是 true
          character.traverse((child) => {
            if (child instanceof THREE.Object3D) {
              child.matrixAutoUpdate = true;
              child.matrixWorldAutoUpdate = true;
            }
          });
          
          // 确保角色的矩阵在加载时就正确设置
          character.updateMatrixWorld(true);
          
          // 调试：打印角色结构
          console.log('📦 角色模型结构:');
          console.log('  - 根节点类型:', character.type);
          console.log('  - 根节点名称:', character.name);
          console.log('  - 子对象数量:', character.children.length);
          character.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
              console.log(`  - Mesh: ${child.name || 'unnamed'}, 类型: ${child.type}`);
            }
          });

          // 检查并打印骨骼信息
          let boneCount = 0;
          let skinnedMeshCount = 0;
          const boneNames: string[] = [];
          let skeleton: THREE.Skeleton | null = null;
          const boneMap = new Map<string, THREE.Bone>();

          character.traverse((child) => {
            // 确保所有子对象可见
            child.visible = true;
            
            if (child instanceof THREE.Bone) {
              boneCount++;
              boneNames.push(child.name);
            }
            
            if (child instanceof THREE.SkinnedMesh) {
              skinnedMeshCount++;
              if (child.skeleton) {
                skeleton = child.skeleton;
                console.log('✓ 找到 SkinnedMesh，骨骼数量:', child.skeleton.bones.length);
                console.log('✓ 骨骼名称列表:', child.skeleton.bones.map((b) => b.name).join(', '));
                
                // 构建骨骼映射
                child.skeleton.bones.forEach((bone) => {
                  boneMap.set(bone.name, bone);
                });
                
                // 确保 SkinnedMesh 可见
                child.visible = true;
              }
            }
            
            if (child instanceof THREE.Mesh) {
              // 确保材质正确显示（非线框模式）
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial || 
                      mat instanceof THREE.MeshBasicMaterial ||
                      mat instanceof THREE.MeshPhongMaterial ||
                      mat instanceof THREE.MeshLambertMaterial) {
                    mat.wireframe = false;
                    mat.needsUpdate = true;
                  }
                });
              } else if (child.material instanceof THREE.MeshStandardMaterial || 
                         child.material instanceof THREE.MeshBasicMaterial ||
                         child.material instanceof THREE.MeshPhongMaterial ||
                         child.material instanceof THREE.MeshLambertMaterial) {
                child.material.wireframe = false;
                child.material.needsUpdate = true;
              }
              child.visible = true;
            }
          });

          // 查找根骨骼（root bone）
          let rootBone: THREE.Bone | undefined = undefined;
          if (skeleton !== null && boneMap.size > 0) {
            // 优先查找名为 "root"、"Root"、"Hips" 的骨骼
            const rootBoneNames = ['root', 'Root', 'Hips', 'hips', 'Hip', 'hip'];
            for (const name of rootBoneNames) {
              const bone = boneMap.get(name);
              if (bone) {
                rootBone = bone;
                console.log(`✓ 找到根骨骼: ${name}`);
                break;
              }
            }
            
            // 如果没找到，使用骨骼列表的第一个骨骼（通常是根骨骼）
            if (!rootBone) {
              const skel = skeleton as THREE.Skeleton;
              if (skel && skel.bones && skel.bones.length > 0) {
                rootBone = skel.bones[0];
                if (rootBone) {
                  console.log(`✓ 使用第一个骨骼作为根骨骼: ${rootBone.name}`);
                }
              }
            }
            
            if (rootBone) {
              console.log(`✓ 根骨骼位置:`, rootBone.position.toArray());
            }
          }

          console.log(`✓ 模型加载完成 - 骨骼数: ${boneCount}, SkinnedMesh数: ${skinnedMeshCount}`);
          if (boneMap.size > 0) {
            console.log(`✓ 骨骼映射已构建，包含 ${boneMap.size} 个骨骼`);
          } else {
            console.warn('⚠ 警告: 未找到骨骼系统，模型可能无法应用姿势');
          }

          // 添加角色到场景
          sceneRef.current.add(character);

          // 创建 TransformControls（每个角色一个）
          const transformControls = new TransformControls(
            cameraRef.current,
            rendererRef.current.domElement
          );
          // 设置 TransformControls 为移动模式
          transformControls.setMode('translate');
          transformControls.setSpace('world'); // 使用世界空间，确保移动方向正确
          transformControls.showX = true;
          transformControls.showY = true;
          transformControls.showZ = true;
          transformControls.setSize(0.8); // 增大控制轴大小，更容易操作
          (transformControls as any).visible = false; // 初始不可见，选中后才显示
          
          // 确保 TransformControls 可以正确交互
          transformControls.enabled = true;
          
          // 确保 TransformControls 可以接收鼠标事件
          transformControls.addEventListener('mouseDown', () => {
            console.log('🖱️ TransformControls 鼠标按下');
          });
          
          transformControls.addEventListener('mouseUp', () => {
            console.log('🖱️ TransformControls 鼠标释放');
          });

          // 当拖拽时禁用 OrbitControls，并添加调试信息
          let isDragging = false;
          transformControls.addEventListener('dragging-changed', (event: any) => {
            isDragging = Boolean(event.value);
            if (controlsRef.current) {
              controlsRef.current.enabled = !event.value;
            }
            // 调试信息
            if (event.value) {
              console.log('🎯 开始拖拽角色');
            } else {
              console.log('✅ 拖拽结束 - 最终位置:', charData.group.position.toArray());
            }
          });

          // 将 TransformControls 的 root 对象添加到场景中（兼容新版 three）
          addTransformControlsToScene(sceneRef.current, transformControls);

          // 监听变换事件 - 当控制轴移动时，角色会自动跟随（因为已 attach）
          // 注意：如果附加到 root 骨骼，直接控制骨骼位置；如果附加到 group，控制组位置
          transformControls.addEventListener('change', () => {
            const attachedObject = transformControls.object;
            
            // 情况1：附加到根骨骼（推荐方式，直接控制骨骼）
            if (charData.rootBone && attachedObject === charData.rootBone) {
              // TransformControls 已经更新了 rootBone 的 position/rotation/scale
              // 我们需要同步这些变换并更新整个骨骼系统
              
              const mode = transformControls.getMode();
              
              // 根据模式同步不同的变换属性
              if (mode === 'translate') {
                // 位置已经由 TransformControls 更新，只需同步
                // rootBone.position 已经被 TransformControls 更新
              } else if (mode === 'rotate') {
                // 旋转已经由 TransformControls 更新
                // rootBone.rotation 已经被 TransformControls 更新
              } else if (mode === 'scale') {
                // 缩放已经由 TransformControls 更新
                // rootBone.scale 已经被 TransformControls 更新
              }
              
              // 方法1：确保根骨骼的 matrix 已更新（包含所有变换）
              charData.rootBone.updateMatrix();
              
              // 方法2：更新整个骨骼系统
              if (charData.skeleton) {
                // 更新所有骨骼的 matrixWorld
                charData.skeleton.bones.forEach((bone) => {
                  bone.updateMatrixWorld(true);
                });
                // 更新骨骼系统
                charData.skeleton.update();
              }
              
              // 方法3：更新所有 SkinnedMesh
              charData.group.traverse((child) => {
                if (child instanceof THREE.SkinnedMesh && child.skeleton) {
                  child.skeleton.bones.forEach((bone) => {
                    bone.updateMatrixWorld(true);
                  });
                  child.skeleton.update();
                }
              });
              
              // 方法4：更新整个组的 matrixWorld
              charData.group.updateMatrixWorld(true);
              
              // 调试信息
              if (isDragging) {
                const worldPos = charData.rootBone.getWorldPosition(new THREE.Vector3());
                console.log(`📍 拖拽根骨骼 (${mode}) - 骨骼位置:`, charData.rootBone.position.toArray());
                console.log('  - 骨骼旋转:', charData.rootBone.rotation.toArray());
                console.log('  - 骨骼缩放:', charData.rootBone.scale.toArray());
                console.log('  - 骨骼世界位置:', worldPos.toArray());
              }
            }
            // 情况2：附加到 group（备用方式）
            else if (attachedObject === charData.group) {
              // 关键修复：在 Three.js 0.160+ 中，TransformControls 可能不会自动更新子对象的 matrixWorld
              // 我们需要手动同步 position/rotation/scale 并强制更新所有矩阵
              
              const mode = transformControls.getMode();
              
              // 根据模式同步不同的变换属性
              if (mode === 'translate') {
                // 同步位置
                const newPos = attachedObject.position.clone();
                if (!charData.group.position.equals(newPos)) {
                  charData.group.position.copy(newPos);
                }
              } else if (mode === 'rotate') {
                // 同步旋转
                charData.group.rotation.copy(attachedObject.rotation);
              } else if (mode === 'scale') {
                // 同步缩放
                charData.group.scale.copy(attachedObject.scale);
              }
              
              // 方法2：强制更新 matrix（这会重新计算基于所有变换的 matrix）
              charData.group.updateMatrix();
              
              // 方法3：强制更新所有子对象的 matrixWorld
              // 关键：使用 true 参数强制更新，即使父对象已更新也要更新子对象
              // 在 Three.js 0.160+ 中，可能需要多次调用才能确保所有子对象都更新
              charData.group.updateMatrixWorld(true);
              
              // 方法3.5：再次强制更新，确保所有子对象都正确更新
              charData.group.updateMatrixWorld(true);
              
              // 方法4：遍历所有子对象，确保它们的 matrixWorld 都正确更新
              // 关键：使用深度优先遍历，确保所有层级的对象都更新
              charData.group.traverse((child) => {
                if (child instanceof THREE.Object3D) {
                  // 确保 matrixAutoUpdate 是 true
                  child.matrixAutoUpdate = true;
                  child.matrixWorldAutoUpdate = true;
                  
                  // 强制标记需要更新
                  child.matrixWorldNeedsUpdate = true;
                  
                  // 强制更新 matrixWorld（使用 true 确保即使父对象已更新也重新计算）
                  child.updateMatrixWorld(true);
                  
                  // 如果是 Mesh 或 SkinnedMesh，确保其几何体和材质也更新
                  if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
                    // 确保材质需要更新
                    if (Array.isArray(child.material)) {
                      child.material.forEach((mat) => {
                        if (mat) mat.needsUpdate = true;
                      });
                    } else if (child.material) {
                      child.material.needsUpdate = true;
                    }
                  }
                  
                  // 如果是 SkinnedMesh，更新骨骼系统
                  if (child instanceof THREE.SkinnedMesh && child.skeleton) {
                    child.skeleton.bones.forEach((bone: THREE.Bone) => {
                      bone.updateMatrixWorld(true);
                    });
                    child.skeleton.update();
                  }
                }
              });
              
              // 方法4：如果角色有全局骨骼系统，也需要更新
              if (charData.skeleton) {
                charData.skeleton.bones.forEach((bone: THREE.Bone) => {
                  bone.updateMatrixWorld(true);
                });
                charData.skeleton.update();
              }
              
              // 调试信息
              if (isDragging) {
                const charPos = charData.group.position.toArray();
                const worldPos = new THREE.Vector3();
                charData.group.getWorldPosition(worldPos);
                console.log(`📍 拖拽中 (${mode}) - 角色位置:`, charPos);
                console.log('  - 角色旋转:', charData.group.rotation.toArray());
                console.log('  - 角色缩放:', charData.group.scale.toArray());
                console.log('  - 世界位置:', worldPos.toArray());
              }
            }
            
            // 无论附加到哪个对象，都需要更新骨骼系统和强制渲染
            // 更新所有 SkinnedMesh 的骨骼系统
            if (charData.skeleton) {
              charData.skeleton.bones.forEach((bone: THREE.Bone) => {
                bone.updateMatrixWorld(true);
              });
              charData.skeleton.update();
            }
            
            // 遍历所有 SkinnedMesh 并更新其骨骼
            charData.group.traverse((child) => {
              if (child instanceof THREE.SkinnedMesh && child.skeleton) {
                child.skeleton.bones.forEach((bone: THREE.Bone) => {
                  bone.updateMatrixWorld(true);
                });
                child.skeleton.update();
              }
            });
            
            // 关键修复：强制触发一次渲染，确保视觉更新
            // 注意：虽然渲染循环会持续运行，但在拖拽时立即渲染可以确保视觉反馈
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            
            console.log('🔄 TransformControls 对象已变化');
          });

          // 添加到场景（但不立即附加到角色）
          addTransformControlsToScene(sceneRef.current, transformControls);

          // 获取模型名称
          const modelName = path.split('/').pop()?.replace('.glb', '') || '角色';
          const charData: Character = {
            id,
            group: character,
            transformControls,
            modelPath: path,
            name: modelName,
            skeleton: skeleton || undefined,
            boneMap: boneMap.size > 0 ? boneMap : undefined,
            rootBone: rootBone,
          };

          charactersRef.current.set(id, charData);
          
          // 确保模型在场景中可见并正确初始化
          character.updateMatrixWorld(true);
          
          // 初始化骨骼系统
          if (skeleton) {
            const skel = skeleton as THREE.Skeleton;
            skel.bones.forEach((bone: THREE.Bone) => {
              bone.updateMatrixWorld(true);
            });
            skel.update();
          }
          
          // 确保所有 SkinnedMesh 正确初始化
          character.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh && child.skeleton) {
              child.skeleton.bones.forEach((bone) => {
                bone.updateMatrixWorld(true);
              });
              child.skeleton.update();
            }
          });

          // 自动选中新添加的角色
          setTimeout(() => {
            if (ref && typeof ref !== 'function' && ref.current) {
              ref.current.selectCharacter(id);
            }
          }, 200);
        },
        (progress) => {
          console.log('加载进度:', (progress.loaded / progress.total) * 100, '%');
        },
        (error) => {
          console.error('加载模型失败:', error);
        }
      );

      return id;
    };

    useEffect(() => {
      if (!containerRef.current) return;
      const initialShot = getShot(shotId);
      if (!initialShot) return;

      let scene: THREE.Scene;
      let camera: THREE.PerspectiveCamera;
      let renderer: THREE.WebGLRenderer;
      let controls: OrbitControls;

      // 初始化场景
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;

      // 初始化相机
      camera = new THREE.PerspectiveCamera(
        50,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );

      // 初始化渲染器（注意：OrbitControls 需要 renderer.domElement，所以必须先创建 renderer）
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        // 禁用某些优化，确保正确渲染
        powerPreference: "high-performance"
      });
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
      renderer.setPixelRatio(window.devicePixelRatio);
      // 确保渲染器正确更新
      renderer.shadowMap.enabled = false;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 初始化控制器（放在渲染器创建之后，避免 renderer 为空导致错误）
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.6, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      // 初始化相机位置（只在切换 shotId 时做一次）
      // 后续 framing/cameraAngle 的变化由下面的 useEffect 只更新相机参数，不重建场景
      // @ts-ignore - initialShot 来自 store，结构与 Shot 一致
      applyCameraForShot(camera, controls, initialShot);

      cameraRef.current = camera;

      // 添加光源（增强光照以确保模型可见）
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(5, 10, 5);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-5, 5, -5);
      scene.add(directionalLight2);

      // 添加半球光以提供更柔和的光照
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      hemisphereLight.position.set(0, 10, 0);
      scene.add(hemisphereLight);

      // 添加网格辅助
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);

      // 渲染循环
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);
        
        // 更新控制器
        controls.update();
        
        // 更新 TransformControls 相关对象（必须在渲染前更新）
        // 注意：有些 three.js 版本里的 TransformControls 实例本身没有 updateMatrixWorld 方法，
        // 之前直接调用会导致报错并造成无限 requestAnimationFrame 循环卡死。
        charactersRef.current.forEach((char) => {
          if ((char.transformControls as any).visible && char.transformControls.object) {
            // 如果附加对象是角色，先更新角色矩阵
            if (char.transformControls.object === char.group) {
              // 确保角色的所有子对象也更新（关键：必须在渲染前更新）
              // 强制标记需要更新
              char.group.traverse((child) => {
                if (child instanceof THREE.Object3D) {
                  child.matrixWorldNeedsUpdate = true;
                }
              });
              // 从根组开始更新
              char.group.updateMatrixWorld(true);
              // 再次遍历确保所有子对象都更新
              char.group.traverse((child) => {
                if (child instanceof THREE.Object3D) {
                  if (child.matrixWorldNeedsUpdate) {
                    child.updateMatrixWorld(false);
                  }
                }
              });
            }
            // TransformControls 绑定的 object 已在上面更新，这里不要再对控件本身调用 updateMatrixWorld，
            // 否则在某些环境中会因为不存在该方法而抛异常。
          }
        });
        
        // 更新所有角色的骨骼系统
        charactersRef.current.forEach((char) => {
          // 确保角色的矩阵在每一帧都更新（特别是当 TransformControls 附加时）
          if ((char.transformControls as any).visible && char.transformControls.object === char.group) {
            // 如果 TransformControls 附加到角色，确保矩阵已更新
            // 注意：即使已经在 change 事件中更新过，也要在渲染前再次更新
            char.group.updateMatrixWorld(true);
            
            // 确保所有子对象的 matrixWorld 也更新
            char.group.traverse((child) => {
              if (child instanceof THREE.Object3D) {
                child.updateMatrixWorld(false);
              }
            });
          }
          
          if (char.skeleton) {
            char.skeleton.update();
          }
        });
        
        renderer.render(scene, camera);
      };
      animate();

      // 处理窗口大小变化
      const handleResize = () => {
        if (!containerRef.current || !camera || !renderer) return;
        camera.aspect =
          containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      };
      window.addEventListener('resize', handleResize);

      // 添加键盘快捷键支持（切换 TransformControls 模式）
      const handleKeyDown = (event: KeyboardEvent) => {
        // 检查是否有活动的 TransformControls
        const activeControls = transformControlsRef.current;
        if (!activeControls || !(activeControls as any).visible) return;

        // 检查是否按下了修饰键（避免与输入框冲突）
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        // 检查焦点是否在输入框或按钮上
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
          return;
        }

        // 按 'T' 切换到平移模式
        if (event.key === 't' || event.key === 'T') {
          event.preventDefault();
          activeControls.setMode('translate');
          console.log('切换到平移模式 (Translate)');
        }
        // 按 'R' 切换到旋转模式
        else if (event.key === 'r' || event.key === 'R') {
          event.preventDefault();
          activeControls.setMode('rotate');
          console.log('切换到旋转模式 (Rotate)');
        }
        // 按 'S' 切换到缩放模式
        else if (event.key === 's' || event.key === 'S') {
          event.preventDefault();
          activeControls.setMode('scale');
          console.log('切换到缩放模式 (Scale)');
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      // 清理函数
      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('keydown', handleKeyDown);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // 清理所有角色
        charactersRef.current.forEach((char) => {
          char.transformControls.dispose();
          char.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
            // 清理纹理
            if (child instanceof THREE.Mesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial || 
                    mat instanceof THREE.MeshBasicMaterial ||
                    mat instanceof THREE.MeshPhongMaterial ||
                    mat instanceof THREE.MeshLambertMaterial) {
                  if (mat.map) mat.map.dispose();
                  if (mat.envMap) mat.envMap.dispose();
                }
                // normalMap, roughnessMap, metalnessMap 只存在于 MeshStandardMaterial
                if (mat instanceof THREE.MeshStandardMaterial) {
                  if (mat.normalMap) mat.normalMap.dispose();
                  if (mat.roughnessMap) mat.roughnessMap.dispose();
                  if (mat.metalnessMap) mat.metalnessMap.dispose();
                }
              });
            }
          });
        });
        charactersRef.current.clear();
        
        // 清理控制器
        if (controls) {
          controls.dispose();
        }
        
        // 清理渲染器和 WebGL 上下文
        if (renderer) {
          // 清理所有纹理
          renderer.dispose();
          // 强制释放 WebGL 上下文
          const gl = renderer.getContext();
          if (gl) {
            const loseContext = (gl as any).getExtension?.('WEBGL_lose_context');
            if (loseContext) {
              loseContext.loseContext();
            }
          }
          // 移除 DOM 元素
          if (containerRef.current && renderer.domElement) {
            try {
              containerRef.current.removeChild(renderer.domElement);
            } catch (e) {
              // 忽略错误
            }
          }
        }
        
        // 清理引用
        sceneRef.current = null;
        rendererRef.current = null;
        cameraRef.current = null;
        controlsRef.current = null;
      };
    }, [shotId, getShot]);

    // 仅更新相机参数，不要重建 three 场景（避免清空姿态内容）
    useEffect(() => {
      if (!cameraRef.current || !controlsRef.current) return;
      const s = shotRef.current;
      if (!s) return;
      applyCameraForShot(cameraRef.current, controlsRef.current, s);
    }, [shot?.framing, shot?.cameraAngle]);

    return (
      <div className="w-full h-full relative">
        <div ref={containerRef} className="w-full h-full" />
        {showSafeFrame && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div style={safeFrameStyle} />
          </div>
        )}
      </div>
    );
  }
);

PoseEditorCanvas.displayName = 'PoseEditorCanvas';
