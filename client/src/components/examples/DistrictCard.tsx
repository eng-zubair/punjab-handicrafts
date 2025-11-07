import DistrictCard from '../DistrictCard';
import multanImage from '@assets/generated_images/Multan_blue_pottery_workshop_21555b73.png';

export default function DistrictCardExample() {
  return (
    <div className="max-w-sm">
      <DistrictCard
        district="Multan"
        giBrand="Multani Crafts"
        image={multanImage}
        craftCount={8}
      />
    </div>
  );
}
