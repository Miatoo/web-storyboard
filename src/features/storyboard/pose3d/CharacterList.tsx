import { useState, useEffect } from 'react';
import { PoseEditorCanvasRef, Character } from './PoseEditorCanvas';
import { useTranslation } from '../../../i18n/useTranslation';

interface CharacterListProps {
  canvasRef: React.RefObject<PoseEditorCanvasRef>;
}

import { getAssetPath } from '../../../utils/pathUtils';

const CHARACTER_MODELS = [
  { key: 'pose3d.character.adultMale', path: getAssetPath('/models/characters/adult-male.glb') },
  { key: 'pose3d.character.adultFemale', path: getAssetPath('/models/characters/adult-female.glb') },
  { key: 'pose3d.character.teenMale', path: getAssetPath('/models/characters/teen-male.glb') },
  { key: 'pose3d.character.teenFemale', path: getAssetPath('/models/characters/teen-female.glb') },
  { key: 'pose3d.character.child', path: getAssetPath('/models/characters/child.glb') },
  { key: 'pose3d.character.baby', path: getAssetPath('/models/characters/baby.glb') },
];

export function CharacterList({ canvasRef }: CharacterListProps) {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 定期更新角色列表
  useEffect(() => {
    const updateCharacters = () => {
      if (canvasRef.current) {
        const chars = canvasRef.current.getCharacters();
        setCharacters(chars);
        const currentSelected = canvasRef.current.getSelectedCharacterId();
        setSelectedId(currentSelected);
      }
    };

    updateCharacters();
    const interval = setInterval(updateCharacters, 500);
    return () => clearInterval(interval);
  }, [canvasRef]);

  const handleAddCharacter = (modelPath: string) => {
    if (!canvasRef.current) return;

    const currentChars = canvasRef.current.getCharacters();
    if (currentChars.length >= 10) {
      alert(t('pose3d.maxCharacters'));
      return;
    }

    const id = canvasRef.current.addCharacter(modelPath);
    setTimeout(() => {
      canvasRef.current?.selectCharacter(id);
      setSelectedId(id);
    }, 200);
  };

  const handleSelectCharacter = (id: string) => {
    canvasRef.current?.selectCharacter(id);
    setSelectedId(id);
  };

  const handleRemoveCharacter = (id: string) => {
    if (confirm(t('pose3d.deleteCharacterConfirm'))) {
      canvasRef.current?.removeCharacter(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  const handleClearSelection = () => {
    canvasRef.current?.selectCharacter(null);
    setSelectedId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold uppercase">
          {t('pose3d.characterManagement').replace('{count}', String(characters.length))}
        </h3>
        {selectedId && (
          <button
            onClick={handleClearSelection}
            className="pixel-border-button px-2 py-1 text-xs bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            {t('pose3d.deselect')}
          </button>
        )}
      </div>

      {/* 角色列表 */}
      <div className="retro-window space-y-1 mb-3 max-h-40 overflow-y-auto p-2 bg-white dark:bg-gray-900">
        {characters.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">
            {t('pose3d.noCharacters')}
          </div>
        ) : (
          characters.map((char) => {
            const modelInfo = CHARACTER_MODELS.find((m) => m.path === char.modelPath) || {
              key: undefined,
            };
            const isSelected = selectedId === char.id;
            return (
              <div
                key={char.id}
                onClick={() => handleSelectCharacter(char.id)}
                className={`retro-window flex items-center justify-between p-2 cursor-pointer text-xs ${
                  isSelected
                    ? 'ring-2 ring-primary'
                    : 'hover:ring-2 hover:ring-black dark:hover:ring-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 border-2 border-black dark:border-white ${
                      isSelected ? 'bg-black dark:bg-white' : 'bg-transparent'
                    }`}
                  />
                  <span className="font-bold">
                    {modelInfo.key ? t(modelInfo.key as any) : char.name}
                  </span>
                  <span className="text-gray-400">({char.id.slice(0, 8)})</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCharacter(char.id);
                  }}
                  className="pixel-border-button px-2 py-1 text-xs bg-white dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900"
                  title={t('pose3d.deleteCharacter')}
                >
                  {t('aiImage.upload.delete')}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 添加角色按钮 */}
      <div>
        <label className="block text-xs font-bold uppercase mb-1">{t('pose3d.addCharacter')}</label>
        <div className="grid grid-cols-2 gap-1">
          {CHARACTER_MODELS.map((model) => (
            <button
              key={model.path}
              onClick={() => handleAddCharacter(model.path)}
              disabled={characters.length >= 10}
              className="pixel-border-button px-2 py-1 text-xs bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {t(model.key as any)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
