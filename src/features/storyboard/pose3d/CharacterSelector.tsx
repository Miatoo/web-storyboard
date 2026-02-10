import { getAssetPath } from '../../../utils/pathUtils';
import { useTranslation } from '../../../i18n/useTranslation';

interface CharacterSelectorProps {
  shotId: string;
  onCharacterChange: (modelPath: string) => void;
  currentModelPath: string;
}

const CHARACTER_MODELS = [
  { key: 'pose3d.character.adultMale', path: getAssetPath('/models/characters/adult-male.glb') },
  { key: 'pose3d.character.adultFemale', path: getAssetPath('/models/characters/adult-female.glb') },
  { key: 'pose3d.character.teenMale', path: getAssetPath('/models/characters/teen-male.glb') },
  { key: 'pose3d.character.teenFemale', path: getAssetPath('/models/characters/teen-female.glb') },
  { key: 'pose3d.character.child', path: getAssetPath('/models/characters/child.glb') },
  { key: 'pose3d.character.baby', path: getAssetPath('/models/characters/baby.glb') },
];

export function CharacterSelector({
  shotId: _shotId,
  onCharacterChange,
  currentModelPath,
}: CharacterSelectorProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{t('pose3d.characterModel')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {CHARACTER_MODELS.map((model) => (
          <button
            key={model.path}
            onClick={() => onCharacterChange(model.path)}
            className={`px-3 py-2 rounded text-xs transition-colors ${
              currentModelPath === model.path
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t(model.key as any)}
          </button>
        ))}
      </div>
    </div>
  );
}

