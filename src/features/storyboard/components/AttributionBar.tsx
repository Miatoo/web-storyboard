import { useTranslation } from '../../../i18n/useTranslation';

export function AttributionBar() {
  const { t } = useTranslation();

  return (
    <div className="w-full px-3 py-1 text-[11px] leading-4 border-t border-black/20 dark:border-white/20 bg-white/70 dark:bg-black/30 backdrop-blur">
      <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-gray-700 dark:text-gray-200">
        <span>{t('attribution.prefix')}</span>
        <a
          href="https://github.com/wonderunit/storyboarder"
          target="_blank"
          rel="noreferrer"
          className="underline hover:opacity-80"
        >
          Storyboarder (GitHub)
        </a>
        <span>·</span>
        <a
          href="https://wonderunit.com/storyboarder/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:opacity-80"
        >
          wonderunit.com
        </a>
        <span>·</span>
        <span>{t('attribution.suffix')}</span>
      </div>
    </div>
  );
}











