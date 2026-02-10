import { create } from 'zustand';
import { Project, Shot, ImageVersion } from '../types';

interface ProjectStore {
  project: Project | null;
  
  // Actions
  initProject: (name?: string) => void;
  setProjectFromServer: (project: Project) => void;
  importProject: (importData: {
    project: {
      name?: string;
      aspectRatio?: string;
      pdfHeaderText?: string;
      createdAt?: number;
    };
    shots: Array<{
      shotNumber?: string;
      order?: number;
      framing?: string;
      cameraAngle?: string;
      shotType?: string;
      duration?: number;
      notes?: string;
      imageUrl?: string;
    }>;
  }) => void;
  updateProjectName: (name: string) => void;
  // 这里接受更宽松的字符串，方便扩展更多画幅比例
  updateProjectAspectRatio: (aspectRatio: string) => void;
  updatePdfHeaderText: (text: string) => void;
  
  // Shot CRUD
  createShot: () => string; // 返回新创建的 shot id
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (shotId: string) => void;
  duplicateShot: (shotId: string) => string; // 返回新复制的 shot id
  reorderShots: (shotIds: string[]) => void;
  
  // Getters
  getShot: (shotId: string) => Shot | undefined;
  getShotsSorted: () => Shot[];
  
  // Image Version Management
  addImageVersion: (shotId: string, version: ImageVersion) => void;
  setActiveImageVersion: (shotId: string, versionId: string) => void;
  getActiveImageVersion: (shotId: string) => ImageVersion | null;
}

const createDefaultShot = (order: number): Shot => {
  const id = crypto.randomUUID();
  return {
    id,
    shotNumber: String(order + 1),
    order,
    framing: 'MS',
    cameraAngle: 'eye',
    shotType: 'static',
    duration: 3.0,
    image: '', // 占位图
    notes: '',
    imageSource: 'placeholder',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  
  initProject: (name = '未命名项目') => {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      shots: [],
      aspectRatio: '16:9',
      pdfHeaderText: '第 {page} 页',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set({ project });
  },
  
  setProjectFromServer: (project: Project) => {
    set({ project });
  },
  
  importProject: (importData) => {
    const now = Date.now();
    
    // 创建新项目
    const project: Project = {
      id: crypto.randomUUID(),
      name: importData.project.name || '导入的项目',
      aspectRatio: importData.project.aspectRatio || '16:9',
      pdfHeaderText: importData.project.pdfHeaderText || '第 {page} 页',
      createdAt: importData.project.createdAt || now,
      updatedAt: now,
      shots: [],
    };
    
    // 导入 shots
    const shots: Shot[] = (importData.shots || []).map((importShot, index) => {
      const shot: Shot = {
        id: crypto.randomUUID(),
        shotNumber: importShot.shotNumber || String(index + 1),
        order: importShot.order !== undefined ? importShot.order : index,
        framing: (importShot.framing as any) || 'MS',
        cameraAngle: (importShot.cameraAngle as any) || 'eye',
        shotType: (importShot.shotType as any) || 'static',
        duration: importShot.duration || 3.0,
        notes: importShot.notes || '',
        image: importShot.imageUrl || '',
        imageSource: importShot.imageUrl ? 'drawing' : 'placeholder',
        createdAt: now,
        updatedAt: now,
      };
      return shot;
    });
    
    // 按 order 排序
    shots.sort((a, b) => a.order - b.order);
    
    project.shots = shots;
    set({ project });
  },
  
  updateProjectName: (name: string) => {
    const { project } = get();
    if (project) {
      set({
        project: {
          ...project,
          name,
          updatedAt: Date.now(),
        },
      });
    }
  },
  
  updateProjectAspectRatio: (aspectRatio: string) => {
    const { project } = get();
    if (project) {
      set({
        project: {
          ...project,
          // 允许存储更多自定义/扩展比例
          aspectRatio: aspectRatio as any,
          updatedAt: Date.now(),
        },
      });
    }
  },
  
  updatePdfHeaderText: (text: string) => {
    const { project } = get();
    if (project) {
      set({
        project: {
          ...project,
          pdfHeaderText: text,
          updatedAt: Date.now(),
        },
      });
    }
  },
  
  createShot: () => {
    const { project } = get();
    if (!project) return '';
    
    const newShot = createDefaultShot(project.shots.length);
    const updatedProject = {
      ...project,
      shots: [...project.shots, newShot],
      updatedAt: Date.now(),
    };
    set({ project: updatedProject });
    return newShot.id;
  },
  
  updateShot: (shotId: string, updates: Partial<Shot>) => {
    const { project } = get();
    if (!project) return;
    
    const updatedShots = project.shots.map((shot) =>
      shot.id === shotId
        ? { ...shot, ...updates, updatedAt: Date.now() }
        : shot
    );
    
    set({
      project: {
        ...project,
        shots: updatedShots,
        updatedAt: Date.now(),
      },
    });
  },
  
  deleteShot: (shotId: string) => {
    const { project } = get();
    if (!project) return;
    
    const filteredShots = project.shots
      .filter((shot) => shot.id !== shotId)
      .map((shot, index) => ({
        ...shot,
        order: index,
        shotNumber: String(index + 1),
      }));
    
    set({
      project: {
        ...project,
        shots: filteredShots,
        updatedAt: Date.now(),
      },
    });
  },
  
  duplicateShot: (shotId: string) => {
    const { project } = get();
    if (!project) return '';
    
    const sourceShot = project.shots.find((s) => s.id === shotId);
    if (!sourceShot) return '';
    
    const newShot: Shot = {
      ...sourceShot,
      id: crypto.randomUUID(),
      order: project.shots.length,
      shotNumber: `${sourceShot.shotNumber}B`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const updatedProject = {
      ...project,
      shots: [...project.shots, newShot],
      updatedAt: Date.now(),
    };
    
    set({ project: updatedProject });
    return newShot.id;
  },
  
  reorderShots: (shotIds: string[]) => {
    const { project } = get();
    if (!project) return;
    
    const shotMap = new Map(project.shots.map((shot) => [shot.id, shot]));
    const reorderedShots = shotIds
      .map((id, index) => {
        const shot = shotMap.get(id);
        if (!shot) return null;
        return {
          ...shot,
          order: index,
          shotNumber: String(index + 1),
        };
      })
      .filter((shot): shot is Shot => shot !== null);
    
    set({
      project: {
        ...project,
        shots: reorderedShots,
        updatedAt: Date.now(),
      },
    });
  },
  
  getShot: (shotId: string) => {
    const { project } = get();
    return project?.shots.find((s) => s.id === shotId);
  },
  
  getShotsSorted: () => {
    const { project } = get();
    if (!project) return [];
    return [...project.shots].sort((a, b) => a.order - b.order);
  },
  
  addImageVersion: (shotId: string, version: ImageVersion) => {
    const { project } = get();
    if (!project) return;
    
    const updatedShots = project.shots.map((shot) => {
      if (shot.id === shotId) {
        const versions = shot.imageVersions || [];
        const originalVersion: ImageVersion = {
          id: crypto.randomUUID(),
          image: shot.image,
          source: 'original',
          createdAt: shot.createdAt,
        };
        
        // 如果还没有原图版本，先添加原图版本
        const hasOriginal = versions.some(v => v.source === 'original');
        const allVersions = hasOriginal ? versions : [originalVersion, ...versions];
        
        // 添加新版本
        const newVersions = [...allVersions, version];
        
        // 设置新版本为激活版本，并更新shot.image
        return {
          ...shot,
          imageVersions: newVersions,
          activeVersionId: version.id,
          image: version.image, // 更新当前显示的图片
          updatedAt: Date.now(),
        };
      }
      return shot;
    });
    
    set({
      project: {
        ...project,
        shots: updatedShots,
        updatedAt: Date.now(),
      },
    });
  },
  
  setActiveImageVersion: (shotId: string, versionId: string) => {
    const { project } = get();
    if (!project) return;
    
    const updatedShots = project.shots.map((shot) => {
      if (shot.id === shotId) {
        const versions = shot.imageVersions || [];
        const version = versions.find(v => v.id === versionId);
        if (version) {
          return {
            ...shot,
            activeVersionId: versionId,
            image: version.image, // 更新当前显示的图片
            updatedAt: Date.now(),
          };
        }
      }
      return shot;
    });
    
    set({
      project: {
        ...project,
        shots: updatedShots,
        updatedAt: Date.now(),
      },
    });
  },
  
  getActiveImageVersion: (shotId: string) => {
    const { project } = get();
    if (!project) return null;
    
    const shot = project.shots.find(s => s.id === shotId);
    if (!shot || !shot.imageVersions || shot.imageVersions.length === 0) {
      return null;
    }
    
    if (shot.activeVersionId) {
      return shot.imageVersions.find(v => v.id === shot.activeVersionId) || null;
    }
    
    // 如果没有指定激活版本，返回第一个版本
    return shot.imageVersions[0] || null;
  },
}));

