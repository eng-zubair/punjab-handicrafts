import DistrictBadge from '../DistrictBadge';

export default function DistrictBadgeExample() {
  return (
    <div className="flex gap-2 flex-wrap">
      <DistrictBadge district="Multan" />
      <DistrictBadge district="Lahore" />
      <DistrictBadge district="Bahawalpur" />
    </div>
  );
}
