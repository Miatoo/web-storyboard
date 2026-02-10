import { useState } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';

interface ResultPreviewProps {
  originalImage?: string;
  generatedImage: string;
  onSave: () => void;
  onCancel: () => void;
  onRegenerate?: () => void;
}

export function ResultPreview({
  originalImage,
  generatedImage,
  onSave,
  onCancel,
  onRegenerate,
}: ResultPreviewProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'generated' | 'compare'>('generated');
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{t('aiImage.result.title')}</h3>
        <div className="flex gap-2">
          {originalImage && (
            <button
              onClick={() => setViewMode(viewMode === 'compare' ? 'generated' : 'compare')}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              {viewMode === 'compare' ? t('aiImage.result.viewOnly') : t('aiImage.result.compareMode')}
            </button>
          )}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            {isZoomed ? t('aiImage.result.zoomOut') : t('aiImage.result.zoomIn')}
          </button>
        </div>
      </div>

      <div className={`border border-gray-300 rounded bg-gray-50 ${
        isZoomed ? 'fixed inset-4 z-[9999] bg-white' : ''
      }`}>
        {viewMode === 'compare' && originalImage ? (
          <div className="grid grid-cols-2 gap-2 p-2">
            <div>
              <div className="text-xs text-gray-500 mb-1 text-center">{t('aiImage.result.original')}</div>
              <img
                src={originalImage}
                alt={t('aiImage.result.original')}
                className="w-full h-auto object-contain max-h-96"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 text-center">{t('aiImage.result.aiGenerated')}</div>
              <img
                src={generatedImage}
                alt={t('aiImage.result.aiGenerated')}
                className="w-full h-auto object-contain max-h-96"
              />
            </div>
          </div>
        ) : (
          <div className="p-2">
            <img
              src={generatedImage}
              alt={t('aiImage.result.aiResultAlt')}
              className="w-full h-auto object-contain max-h-96 mx-auto"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {t('aiImage.result.saveNewVersion')}
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
          >
            {t('aiImage.result.regenerate')}
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

