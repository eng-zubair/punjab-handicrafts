import GITag from '../GITag';

export default function GITagExample() {
  return (
    <div className="flex gap-2 flex-wrap">
      <GITag giBrand="Multani Crafts" />
      <GITag giBrand="Lahore Heritage Crafts" />
      <GITag giBrand="Cholistani Heritage" />
    </div>
  );
}
