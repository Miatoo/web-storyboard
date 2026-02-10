import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { ImageVersion } from '../../../types';
import { generateAIImage } from '../../../services/aiImageService';
import { ImageUploader } from '../aiimage/ImageUploader';
import { PromptInput } from '../aiimage/PromptInput';
import { APIConfigPanel } from '../aiimage/APIConfigPanel';
import { GenerationStatus } from '../aiimage/GenerationStatus';
import { ResultPreview } from '../aiimage/ResultPreview';
import { VersionSelector } from '../aiimage/VersionSelector';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAuthStore } from '../../../store/authStore';

export function AIImageView() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const project = useProjectStore((state) => state.project);
  const activeShotId = useUIStore((state) => state.activeShotId);
  const getShot = useProjectStore((state) => state.getShot);
  const addImageVersion = useProjectStore((state) => state.addImageVersion);
  const setActiveImageVersion = useProjectStore((state) => state.setActiveImageVersion);

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [roleImage, setRoleImage] = useState<string>('');
  const [sceneImage, setSceneImage] = useState<string>('');
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [apiConfig, setApiConfig] = useState<any>(null);
  
  // 用于跟踪需要清理的blob URL
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const activeShot = activeShotId ? getShot(activeShotId) : null;

  // 获取当前分镜的图片（优先使用激活版本）
  // 注意：每次调用都重新获取，确保使用最新的当前镜头图片
  const getCurrentShotImage = () => {
    if (!activeShot) return '';
    
    // 优先使用激活的版本图片
    if (activeShot.activeVersionId && activeShot.imageVersions) {
      const version = activeShot.imageVersions.find(v => v.id === activeShot.activeVersionId);
      if (version && version.image) {
        return version.image;
      }
    }
    
    // 否则使用原始图片
    return activeShot.image || '';
  };

  // 每次渲染时都重新获取当前镜头的图片，确保使用最新的
  const currentShotImage = getCurrentShotImage();
  const versions = activeShot?.imageVersions || [];

  // 当切换镜头时，清理生成状态和生成的图片
  useEffect(() => {
    // 清理之前生成的图片（如果是blob URL）
    if (generatedImage && generatedImage.startsWith('blob:')) {
      URL.revokeObjectURL(generatedImage);
      blobUrlsRef.current.delete(generatedImage);
    }
    
    // 重置生成状态
    setGeneratedImage('');
    setGenerationStatus('idle');
    setErrorMessage('');
    setGenerationProgress(0);
  }, [activeShotId]); // 当激活的镜头ID改变时触发

  useEffect(() => {
    // 检查API配置
    const config = localStorage.getItem('aiImageConfig');
    if (config) {
      try {
        setApiConfig(JSON.parse(config));
      } catch {
        // 忽略解析错误
      }
    }
    
    // 组件卸载时清理所有blob URL
    return () => {
      blobUrlsRef.current.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  const handleGenerate = async () => {
    if (!currentUser) {
      setErrorMessage(t('auth.loginRequiredForAI'));
      return;
    }
    if (!activeShot) {
      setErrorMessage(t('aiImage.error.selectShotFirst'));
      return;
    }

    if (!prompt.trim()) {
      setErrorMessage(t('aiImage.error.enterPrompt'));
      return;
    }

    if (!apiConfig || !apiConfig.apiEndpoint || !apiConfig.apiKey || !apiConfig.modelName) {
      setErrorMessage(t('aiImage.error.configApi'));
      return;
    }

    if (!currentShotImage) {
      setErrorMessage(t('aiImage.error.shotNoImage'));
      return;
    }

    setGenerationStatus('generating');
    setGenerationProgress(0);
    setErrorMessage('');
    setGeneratedImage('');

    // 重新获取当前镜头的图片，确保使用最新的（防止切换镜头后使用旧图片）
    const latestShotImage = getCurrentShotImage();
    
    if (!latestShotImage) {
      setErrorMessage(t('aiImage.error.shotNoImage'));
      setGenerationStatus('error');
      return;
    }

    // 验证当前激活的镜头是否仍然有效
    if (!activeShot || activeShot.id !== activeShotId) {
      setErrorMessage(t('aiImage.error.shotSwitched'));
      setGenerationStatus('error');
      return;
    }

    console.log('开始生成AI图片，使用当前镜头ID:', activeShot.id, '图片长度:', latestShotImage.length);

    try {
      const result = await generateAIImage({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        storyboardImage: latestShotImage, // 使用最新获取的当前镜头图片
        roleImage: roleImage || undefined,
        sceneImage: sceneImage || undefined,
        aspectRatio: project?.aspectRatio || '16:9',
        onProgress: (progress) => {
          setGenerationProgress(progress);
        },
      });

      // 如果返回的是blob URL，记录它以便后续清理
      if (result.image.startsWith('blob:')) {
        blobUrlsRef.current.add(result.image);
      }
      
      setGeneratedImage(result.image);
      setGenerationStatus('success');
    } catch (error: any) {
      setGenerationStatus('error');
      setErrorMessage(error.message || t('aiImage.error.generateFailedRetry'));
      console.error('AI生图失败:', error);
    }
  };

  const handleSaveVersion = () => {
    if (!activeShot || !generatedImage) return;

    // 注意：保存版本时，图片会被存储到store中，所以不需要清理
    // 但如果图片是blob URL，我们需要确保它不会被清理（因为store中会引用它）
    // 实际上，base64格式的图片更安全，因为不需要管理URL生命周期

    const newVersion: ImageVersion = {
      id: crypto.randomUUID(),
      image: generatedImage,
      source: 'ai_generated',
      createdAt: Date.now(),
      aiPrompt: prompt,
      aiConfig: {
        model: apiConfig?.modelName,
        referenceImages: [roleImage, sceneImage].filter(Boolean) as string[],
      },
    };

    addImageVersion(activeShot.id, newVersion);
    
    // 清理当前生成的图片（如果是blob URL且未保存）
    // 注意：如果图片已经保存到版本中，不应该清理，因为版本可能会使用它
    // 但为了安全，我们只在取消时才清理，保存时不清理（让版本管理图片的生命周期）
    
    setGeneratedImage('');
    setGenerationStatus('idle');
  };

  const handleCancel = () => {
    // 清理当前生成的图片（如果是blob URL）
    if (generatedImage && generatedImage.startsWith('blob:')) {
      URL.revokeObjectURL(generatedImage);
      blobUrlsRef.current.delete(generatedImage);
    }
    
    setGeneratedImage('');
    setGenerationStatus('idle');
  };

  const handleRegenerate = () => {
    // 清理当前生成的图片（如果是blob URL）
    if (generatedImage && generatedImage.startsWith('blob:')) {
      URL.revokeObjectURL(generatedImage);
      blobUrlsRef.current.delete(generatedImage);
    }
    
    setGeneratedImage('');
    setGenerationStatus('idle');
    handleGenerate();
  };

  const canGenerate = 
    activeShot !== null &&
    currentShotImage !== '' &&
    prompt.trim() !== '' &&
    apiConfig !== null &&
    apiConfig.apiEndpoint &&
    apiConfig.apiKey &&
    apiConfig.modelName;

  return (
    <div className="flex h-full w-full">
      {/* 左侧面板 */}
      <div className="w-80 flex flex-col shrink-0 p-1 min-w-0">
        <div className="retro-window flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
          <div className="retro-header">
            <span>{t('aiImage.referenceImages')}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto">
            {activeShot ? (
              <>
                <div>
                  <h3 className="text-sm font-bold uppercase mb-2">{t('aiImage.currentShot')}</h3>
                  {currentShotImage ? (
                    <img
                      src={currentShotImage}
                      alt={t('aiImage.currentShot.alt')}
                      className="w-full border-2 border-black dark:border-white"
                    />
                  ) : (
                    <div className="text-xs text-gray-500 p-2 border-2 border-black dark:border-white text-center bg-gray-50 dark:bg-gray-800">
                      {t('aiImage.noImage')}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase mb-2">{t('aiImage.reference')}</h3>
                <div className="space-y-3">
                  <ImageUploader
                    label={t('aiImage.reference.role')}
                    value={roleImage}
                    onChange={setRoleImage}
                    onRemove={() => setRoleImage('')}
                  />
                  <ImageUploader
                    label={t('aiImage.reference.scene')}
                    value={sceneImage}
                    onChange={setSceneImage}
                    onRemove={() => setSceneImage('')}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {t('aiImage.selectShot')}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* 中央画布 */}
      <div className="flex-1 flex flex-col overflow-hidden p-1 min-w-0">
        <div className="retro-window flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
          <div className="retro-header">
            <span>{t('aiImage.preview.title')}</span>
          </div>
          <div className="flex-1 p-2 overflow-y-auto">
            {activeShot ? (
              <div className="space-y-2">
                {generatedImage ? (
                  <ResultPreview
                    originalImage={currentShotImage}
                    generatedImage={generatedImage}
                    onSave={handleSaveVersion}
                    onCancel={handleCancel}
                    onRegenerate={handleRegenerate}
                  />
                ) : (
                  <div className="retro-window p-2 bg-white dark:bg-gray-900">
                    <h3 className="text-sm font-bold uppercase mb-2 border-b border-black dark:border-white">{t('aiImage.preview.currentShot')}</h3>
                    {currentShotImage ? (
                      <img
                        src={currentShotImage}
                        alt={t('aiImage.currentShot.alt')}
                        className="w-full max-w-2xl mx-auto object-contain mt-4"
                      />
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        {t('aiImage.preview.noShotImage')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {t('aiImage.selectShot')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧面板 */}
      <div className="w-80 flex flex-col shrink-0 p-1 min-w-0">
        <div className="retro-window flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
          <div className="retro-header">
            <span>{t('aiImage.panel.title')}</span>
          </div>
          <div className="p-2 space-y-3 overflow-y-auto">
          <APIConfigPanel onConfigChange={setApiConfig} />

          {activeShot && (
            <>
              <div className="border-t-2 border-black dark:border-white pt-4">
                <PromptInput
                  prompt={prompt}
                  negativePrompt={negativePrompt}
                  onPromptChange={setPrompt}
                  onNegativePromptChange={setNegativePrompt}
                />
              </div>

              <div className="border-t-2 border-black dark:border-white pt-4">
                <GenerationStatus
                  status={generationStatus}
                  progress={generationProgress}
                  errorMessage={errorMessage}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generationStatus === 'generating'}
                  className={`
                    pixel-border-button w-full px-4 py-2
                    ${canGenerate && generationStatus !== 'generating'
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {generationStatus === 'generating' ? t('aiImage.generating') : t('aiImage.generate')}
                </button>
              </div>

              {versions.length > 0 && (
                <div className="border-t-2 border-black dark:border-white pt-4">
                  <VersionSelector
                    versions={versions}
                    activeVersionId={activeShot.activeVersionId}
                    onSelectVersion={(versionId) => {
                      if (activeShot) {
                        setActiveImageVersion(activeShot.id, versionId);
                      }
                    }}
                    onDeleteVersion={(versionId) => {
                      // TODO: 实现删除版本功能
                      console.log('删除版本:', versionId);
                    }}
                  />
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

