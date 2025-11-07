import VendorCard from '../VendorCard';
import vendorAvatar from '@assets/generated_images/Artisan_vendor_profile_portrait_cf010960.png';

export default function VendorCardExample() {
  return (
    <div className="max-w-md">
      <VendorCard
        id="1"
        name="Ahmad Pottery Works"
        district="Multan"
        giBrands={["Multani Crafts"]}
        rating={4.8}
        totalProducts={42}
        avatar={vendorAvatar}
      />
    </div>
  );
}
