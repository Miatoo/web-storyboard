import { useRef } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useTranslation } from '../../../i18n/useTranslation';

export function ImportButton() {
  const { t } = useTranslation();
  const project = useProjectStore((state) => state.project);
  const importProject = useProjectStore((state) => state.importProject);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.json')) {
      alert(t('import.invalidFileType'));
      return;
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // 验证导入数据格式
      if (!importData || typeof importData !== 'object') {
        throw new Error(t('import.invalidJson'));
      }

      if (!importData.project) {
        throw new Error(t('import.missingProject'));
      }

      if (!Array.isArray(importData.shots)) {
        throw new Error(t('import.missingShots'));
      }

      // 确认导入（覆盖当前项目）
      const confirmed = window.confirm(
        project
          ? t('import.confirmOverwrite').replace('{name}', project.name)
          : t('import.confirm')
      );

      if (!confirmed) {
        // 重置文件输入，允许重新选择同一个文件
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // 导入项目
      importProject({
        project: {
          name: importData.project.name,
          aspectRatio: importData.project.aspectRatio,
          pdfHeaderText: importData.project.pdfHeaderText,
          createdAt: importData.project.createdAt,
        },
        shots: importData.shots || [],
      });

      alert(t('import.success'));
    } catch (error) {
      console.error('导入失败:', error);
      alert(`${t('import.failedPrefix')}${error instanceof Error ? error.message : t('aiImage.status.unknownError')}`);
    } finally {
      // 重置文件输入，允许重新选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <button
        onClick={handleImportClick}
        className="pixel-border-button bg-white dark:bg-gray-700 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
      >
        <span>📁</span> {t('common.importJson')}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}

