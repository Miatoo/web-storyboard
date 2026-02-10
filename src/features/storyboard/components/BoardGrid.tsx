import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Shot } from '../../../types';
import { useProjectStore } from '../../../store/projectStore';
import { BoardShotCard } from './BoardShotCard';

interface BoardGridProps {
  shots: Shot[];
  activeShotId: string | null;
  onShotClick: (shotId: string) => void;
  onShotDoubleClick: (shotId: string) => void;
}

export function BoardGrid({
  shots,
  activeShotId,
  onShotClick,
  onShotDoubleClick,
}: BoardGridProps) {
  const reorderShots = useProjectStore((state) => state.reorderShots);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = shots.findIndex((shot) => shot.id === active.id);
      const newIndex = shots.findIndex((shot) => shot.id === over.id);

      const reorderedShots = arrayMove(shots, oldIndex, newIndex);
      const shotIds = reorderedShots.map((shot) => shot.id);
      reorderShots(shotIds);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={shots.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shots.map((shot) => (
            <SortableShotCard
              key={shot.id}
              shot={shot}
              isActive={shot.id === activeShotId}
              onClick={() => onShotClick(shot.id)}
              onDoubleClick={() => onShotDoubleClick(shot.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableShotCardProps {
  shot: Shot;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

function SortableShotCard({
  shot,
  isActive,
  onClick,
  onDoubleClick,
}: SortableShotCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardShotCard
        shot={shot}
        isActive={isActive}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    </div>
  );
}












